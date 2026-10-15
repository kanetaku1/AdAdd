#!/usr/bin/env bash
# Checks migration numbering against a base revision
# (spec/development.md#Migration Numbering).
#
# Usage: apps/api/scripts/check-migrations.sh <base-revision>
#   e.g. apps/api/scripts/check-migrations.sh origin/main
#
# golang-migrate records only the latest applied version. A migration whose
# number is not above every migration already in the base is never applied
# to a database that is past it, so this fails when:
#   * a number is used by more than one migration, or lacks its up/down pair
#   * an added migration's number is not above the base's largest number
#   * a migration that exists in the base was changed, renamed, or deleted
set -euo pipefail

base="${1:?usage: check-migrations.sh <base-revision>}"
root="$(git rev-parse --show-toplevel)"
dir="apps/api/migrations"
pattern='^([0-9]{4})_[a-z0-9_]+\.(up|down)\.sql$'
failed=0

fail() {
  echo "error: $*" >&2
  failed=1
}

version_of() {
  echo "${1%%_*}"
}

# 1. Every file is named NNNN_name.up|down.sql, each number has exactly one
#    name, and each name has both up and down.
declare -A name_by_version=()
declare -A count_by_name=()
for path in "$root/$dir"/*; do
  file="$(basename "$path")"
  if [[ ! "$file" =~ $pattern ]]; then
    fail "$dir/$file: name must be NNNN_snake_case.up.sql or .down.sql"
    continue
  fi
  version="${BASH_REMATCH[1]}"
  name="${file%.up.sql}"
  name="${name%.down.sql}"
  if [[ -n "${name_by_version[$version]:-}" && "${name_by_version[$version]}" != "$name" ]]; then
    fail "number $version is used by both ${name_by_version[$version]} and $name"
  fi
  name_by_version[$version]="$name"
  count_by_name[$name]=$(( ${count_by_name[$name]:-0} + 1 ))
done
for name in "${!count_by_name[@]}"; do
  if [[ "${count_by_name[$name]}" -ne 2 ]]; then
    fail "$name must have exactly one .up.sql and one .down.sql"
  fi
done

# 2. Migrations in the base are applied somewhere; they must stay as they are.
base_files="$(git -C "$root" ls-tree --name-only "$base" "$dir/" | xargs -r -n1 basename)"
base_max=0
for file in $base_files; do
  if ! git -C "$root" diff --quiet "$base" -- "$dir/$file" 2>/dev/null || [[ ! -f "$root/$dir/$file" ]]; then
    fail "$dir/$file exists in $base and must not be changed, renamed, or deleted"
  fi
  version=$((10#$(version_of "$file")))
  (( version > base_max )) && base_max=$version
done

# 3. Added migrations come after everything in the base.
for path in "$root/$dir"/*.sql; do
  file="$(basename "$path")"
  if grep -qxF "$file" <<<"$base_files"; then
    continue
  fi
  version=$((10#$(version_of "$file")))
  if (( version <= base_max )); then
    next=$(printf '%04d' $((base_max + 1)))
    fail "$dir/$file: number must be above $(printf '%04d' "$base_max"), the largest in $base — renumber it to $next or later"
  fi
done

if (( failed )); then
  echo "See spec/development.md#Migration Numbering." >&2
  exit 1
fi
echo "migrations ok (largest in $base: $(printf '%04d' "$base_max"))"
