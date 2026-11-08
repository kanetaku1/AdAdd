#!/usr/bin/env bash
# Recreates the local development databases (adadd, adadd_e2e), loads the
# development seed, and registers the developers in scripts/dev-users.local.csv.
# See spec/development.md#Resetting the local database.
#
# Usage: scripts/reset-dev-database.sh [--yes]
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

mysql_container="adadd-mysql"
mysql_root_password="root_password" # docker-compose.yml (development only)
development_database="adadd"
e2e_database="adadd_e2e"
api_health_url="http://127.0.0.1:8080/health"
developer_users_file="scripts/dev-users.local.csv"

skip_confirmation=false
for argument in "$@"; do
  case "$argument" in
    --yes | -y) skip_confirmation=true ;;
    -h | --help)
      sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $argument" >&2
      exit 1
      ;;
  esac
done

run_mysql() {
  docker exec -i -e MYSQL_PWD="$mysql_root_password" "$mysql_container" mysql -uroot "$@"
}

# --- Developer Users: validate before touching anything ----------------------

# One entry per developer, filled here and turned into SQL in step 5, once the
# Roles of the checked-out branch are known.
developer_user_inserts=()
developer_user_role_codes=()
developer_users_count=0

# Removes ASCII spaces and tabs around a field ("a, b" is read as "a,b").
# A full-width space inside a name is kept.
trim() {
  local value="$1"
  while [[ "$value" == [$' \t']* ]]; do value="${value:1}"; done
  while [[ "$value" == *[$' \t'] ]]; do value="${value%?}"; done
  printf '%s' "$value"
}

if [[ -f "$developer_users_file" ]]; then
  line_number=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1))
    line="${line%$'\r'}"
    [[ -z "${line//[[:space:]]/}" || "$line" == \#* ]] && continue

    if [[ "$line" == *"'"* || "$line" == *'"'* || "$line" == *'\'* ]]; then
      echo "$developer_users_file:$line_number: a field must not contain ' \" or \\" >&2
      exit 1
    fi

    IFS=',' read -r -a fields <<<"$line"
    if [[ ${#fields[@]} -ne 4 ]]; then
      echo "$developer_users_file:$line_number: expected email,name,student_id,role_codes (got ${#fields[@]} fields)" >&2
      exit 1
    fi
    email="$(trim "${fields[0]}")"
    name="$(trim "${fields[1]}")"
    student_id="$(trim "${fields[2]}")"
    role_codes="$(trim "${fields[3]}")"

    if [[ "$email" != *@* || -z "$name" || -z "$role_codes" ]]; then
      echo "$developer_users_file:$line_number: email, name and role_codes are required" >&2
      exit 1
    fi

    student_id_value="NULL"
    [[ -n "$student_id" ]] && student_id_value="'$student_id'"

    IFS='|' read -r -a untrimmed_roles <<<"$role_codes"
    roles=()
    for role_code in "${untrimmed_roles[@]}"; do
      role_code="$(trim "$role_code")"
      roles+=("$role_code")
      if [[ ! "$role_code" =~ ^[A-Z_]+$ ]]; then
        echo "$developer_users_file:$line_number: invalid Role code '$role_code' (uppercase letters and _ only, joined with |)" >&2
        exit 1
      fi
    done

    developer_user_inserts+=("INSERT INTO users (id, student_id, name, email, is_active) VALUES (@user_id, $student_id_value, '$name', '$email', TRUE);")
    developer_user_role_codes+=("${roles[*]}")
    developer_users_count=$((developer_users_count + 1))
  done <"$developer_users_file"
fi

# --- Confirmation -------------------------------------------------------------

if ! docker ps --format '{{.Names}}' | grep -qx "$mysql_container"; then
  echo "$mysql_container is not running. Start it with: docker compose up -d mysql" >&2
  exit 1
fi

if [[ "$skip_confirmation" != true ]]; then
  echo "This deletes every row in the local databases '$development_database' and '$e2e_database',"
  echo "then loads the development seed and $developer_users_count developer User(s) from $developer_users_file."
  read -r -p "Continue? [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "Cancelled."; exit 1; }
fi

# --- 1. Stop the API so it cannot migrate while the databases are recreated ---

echo "==> Stopping the api container"
docker compose stop api

# --- 2. Recreate the databases ------------------------------------------------

echo "==> Recreating $development_database and $e2e_database"
recreate_sql=""
for database in "$development_database" "$e2e_database"; do
  recreate_sql+="DROP DATABASE IF EXISTS \`$database\`;"
  recreate_sql+="CREATE DATABASE \`$database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;"
  recreate_sql+="GRANT ALL PRIVILEGES ON \`$database\`.* TO 'adadd'@'%';"
done
run_mysql -e "$recreate_sql"

# --- 3. Rebuild and start the API (applies this branch's migrations) ----------

echo "==> Rebuilding and starting the api container"
docker compose up -d --build api

echo "==> Waiting for $api_health_url"
for _ in $(seq 1 60); do
  if curl -fsS "$api_health_url" >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  sleep 2
done
if [[ "${api_ready:-false}" != true ]]; then
  echo "The API did not become healthy. Last log lines:" >&2
  docker logs --tail 20 adadd-api >&2
  exit 1
fi

# --- 4. Development seed ------------------------------------------------------

echo "==> Loading the development seed into $development_database"
(
  cd apps/api
  APP_ENV=development DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=adadd DB_PASSWORD=adadd_password \
    DB_NAME="$development_database" go run ./cmd/seed
)

# --- 5. Developer Users -------------------------------------------------------

if [[ $developer_users_count -gt 0 ]]; then
  echo "==> Registering $developer_users_count developer User(s) from $developer_users_file"
  # Roles differ between branches (a branch may add one in a migration), so
  # codes are checked against the roles table this branch's migrations built.
  branch_role_codes=" $(run_mysql "$development_database" -N -e "SELECT code FROM roles;" | tr '\n' ' ') "
  developer_users_sql=""
  for index in "${!developer_user_inserts[@]}"; do
    developer_users_sql+="SET @user_id = UUID();${developer_user_inserts[$index]}"
    for role_code in ${developer_user_role_codes[$index]}; do
      if [[ "$branch_role_codes" != *" $role_code "* ]]; then
        echo "    warning: Role '$role_code' does not exist on this branch (has:${branch_role_codes% }); skipped" >&2
        continue
      fi
      developer_users_sql+="INSERT INTO user_roles (id, user_id, role_id) SELECT UUID(), @user_id, id FROM roles WHERE code = '$role_code';"
    done
  done
  run_mysql "$development_database" -e "START TRANSACTION;${developer_users_sql}COMMIT;"
  run_mysql "$development_database" -e \
    "SELECT u.email, GROUP_CONCAT(r.code ORDER BY r.code SEPARATOR '|') AS roles
       FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id NOT LIKE 'user\\_0%' GROUP BY u.email ORDER BY u.email;"
else
  echo "==> No $developer_users_file: only the seed's fictitious Users exist."
  echo "    Copy scripts/dev-users.example.csv to $developer_users_file to register yourself."
fi

echo "==> Done"
