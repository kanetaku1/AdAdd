#!/usr/bin/env bash
# Checks migrations against a base revision
# (spec/development.md#Migration Numbering).
#
# Usage: apps/api/scripts/check-migrations.sh <base-revision>
#   e.g. apps/api/scripts/check-migrations.sh origin/main
#
# golang-migrate records only the latest applied version. A migration whose
# number is not above every migration already in the base is never applied
# to a database that is past it, so this fails when:
#   * a file is not NNNN_snake_case.up.sql (there are no down migrations)
#   * a number is used by more than one migration
#   * an added migration's number is not above the base's largest number
#   * a migration that exists in the base was changed, renamed, or deleted
set -euo pipefail

base="${1:?usage: check-migrations.sh <base-revision>}"
root="$(git rev-parse --show-toplevel)"
dir="apps/api/migrations"
baseline="0001_baseline.up.sql"
pattern='^([0-9]{4})_[a-z0-9_]+\.up\.sql$'
failed=0

fail() {
  echo "error: $*" >&2
  failed=1
}

version_of() {
  echo "${1%%_*}"
}

# 1. Every file is NNNN_name.up.sql, and each number is used once.
declare -A file_by_version=()
for path in "$root/$dir"/*; do
  file="$(basename "$path")"
  if [[ ! "$file" =~ $pattern ]]; then
    fail "$dir/$file: name must be NNNN_snake_case.up.sql (down migrations are not used)"
    continue
  fi
  version="${BASH_REMATCH[1]}"
  if [[ -n "${file_by_version[$version]:-}" ]]; then
    fail "number $version is used by both ${file_by_version[$version]} and $file"
  fi
  file_by_version[$version]="$file"
done

# 2. Migrations in the base are applied somewhere; they must stay as they are.
#    One exception: the base is from before the baseline squash
#    (spec/development.md#Baseline), so its development-era files are
#    replaced by the baseline rather than kept.
base_files="$(git -C "$root" ls-tree --name-only "$base" "$dir/" | xargs -r -n1 basename)"
if [[ -f "$root/$dir/$baseline" ]] && ! grep -qxF "$baseline" <<<"$base_files"; then
  echo "note: $base is from before the baseline; its migrations are replaced by $baseline"
  base_files=""
fi
base_max=0
for file in $base_files; do
  if [[ ! -f "$root/$dir/$file" ]] || ! git -C "$root" diff --quiet "$base" -- "$dir/$file" 2>/dev/null; then
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
