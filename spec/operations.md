# Production Operations

## Purpose

How AdAdd is set up and started for real operation: the production database, the first Administrator, and loading the existing business data.

This is a handover document. A new Administrator should be able to repeat every step from here alone.

Hosting (where the web app and API run) is still undecided — see `spec/decisions/0002-deployment.md`.

---

# Production Database

The production database is a separate MySQL database. It is never shared with development, test, or E2E data.

## Create the database

MySQL 8.4. Create the database and a user that can reach only that database. Replace `adadd_prod` and the password with your own values.

```sql
CREATE DATABASE adadd_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
CREATE USER 'adadd_prod'@'%' IDENTIFIED BY '<long random password>';
GRANT ALL PRIVILEGES ON adadd_prod.* TO 'adadd_prod'@'%';
```

The collation is `utf8mb4_0900_bin` (`spec/database.md#Character Set and Collation`). Migration `0012` sets it as well, so a database created with another default is corrected on the first start.

## Start the API against it

Point the API at the database with environment variables (`apps/api/.env.example`):

| Variable | Value |
| -------- | ----- |
| `DB_HOST` / `DB_PORT` | MySQL host and port |
| `DB_USER` / `DB_PASSWORD` | the user created above |
| `DB_NAME` | `adadd_prod` |
| `MIGRATE_ON_START` | `true` — applies every migration on start |

Run it with the production configuration below, never with the development `docker-compose.yml`. It must be in place before real data is loaded.

## Production Configuration

Production runs from its own Compose file, `compose.production.yml` (Issue #156). It contains MySQL and the API only. Where the web app runs, and how members reach it, is decided with the hosting (`spec/decisions/0002-deployment.md`).

| Setting | Production value |
| ------- | ---------------- |
| Compose project | `adadd-prod` — its own containers (`adadd-prod-mysql`, `adadd-prod-api`) and named volume. `docker compose down -v` in the development project never touches it |
| `APP_ENV` | `production`. Unset means `development`, so it is always set explicitly |
| `JWT_SECRET` | A long random value, e.g. `openssl rand -base64 48`. The API refuses to start without it (in every environment). Never reuse the development value |
| Database user and passwords | `DB_USER` / `DB_PASSWORD` and the MySQL root password: long random values of their own. Never the development values written in `docker-compose.yml` |
| MySQL port | Not published. Only the API container reaches MySQL, over the Compose network |
| API port | Published on `127.0.0.1:8080` only, never on every interface |
| `ALLOWED_ORIGINS` | The origin of the production web app |
| Authentication | AdAdd session JWTs only. There is no development authentication to switch off (`spec/api.md#Authentication`) |

The values come from `.env.production` at the repository root. Copy `.env.production.example` and fill it in. The file is gitignored and is never committed: the repository is public. Every required value is checked by Compose (`${VAR:?}`), so a missing value stops `up` instead of starting with an empty one.

```bash
# from the repository root
docker compose -f compose.production.yml --env-file .env.production up -d --build
docker compose -f compose.production.yml --env-file .env.production ps
```

On its first start, the MySQL container creates the database and the user from `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, with the collation set by its server options. The SQL in Create the database above is then not needed; it is for a MySQL outside Compose.

The web app:

* `NEXT_PUBLIC_API_BASE_URL` must be set when building it for production. Without it, the build runs in mock mode with fictitious data. After every deployment, sign in and check that the mock-mode banner is not shown.
* The session cookie is `Secure` in a production build, so the web app must be served over HTTPS (`spec/frontend.md#Login`).

## Never run against the production database

* `go run ./cmd/seed` — it creates fictional companies, users, and Years (`spec/development.md#Development Seed`). It refuses to run unless `APP_ENV=development` and the database is `adadd` or `adadd_e2e`, but do not rely on that.
* Go integration tests and Playwright E2E — they empty tables. Their database names must end with `_test` / be the dedicated E2E database.

---

# First Administrator

An empty production database has no User, so nobody can sign in. Users and Roles are normally granted from User List, which only an Administrator can open. The very first Administrator is therefore inserted directly with SQL.

This is the only direct write to the production database allowed by this document (`spec/development.md#Migration First`). Every later User, including more Administrators, is added from User List.

## Steps

1. Start the API once with `MIGRATE_ON_START=true`, so the tables and the fixed Roles exist.
2. Connect to the production database and run (replace the three values):

```sql
SET @user_id = UUID();

INSERT INTO users (id, student_id, name, email, is_active)
VALUES (@user_id, '<student id>', '<full name>', '<Google account email>', TRUE);

INSERT INTO user_roles (id, user_id, role_id)
SELECT UUID(), @user_id, id FROM roles WHERE code = 'ADMINISTRATOR';
```

`email` must be the Google account used to sign in. Case does not matter (`users.email` is case-insensitive). `roles.id` differs per database, so the Role is looked up by `code`, never copied from another database.

3. Check the result. It must return exactly one row with `ADMINISTRATOR`:

```sql
SELECT u.name, u.email, u.is_active, r.code
FROM users u
JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
JOIN roles r ON r.id = ur.role_id
WHERE u.email = '<Google account email>';
```

4. Sign in from the web app with that Google account. User List must be visible.

## Handing over

When the Administrator changes (e.g. at the turn of the festival year), the current Administrator adds the successor from User List and grants `ADMINISTRATOR` there. SQL is used again only when no active Administrator remains.

---

# Initial Data Migration

Moving the existing business from spreadsheets into AdAdd. Done once, for the first Year operated in AdAdd.

## What is migrated

| Data | Migrated | How |
| ---- | -------- | --- |
| Companies (master) | yes | Company CSV import |
| "Had a contract in the preceding Year" per company | yes | `previousYearContract` column of the same CSV |
| Users and Roles | yes | User CSV import |
| Sponsorship Menus of the first Year | yes | Sponsorship Menu screen |
| Past Years' contracts, payments, activity logs, ad materials | **no** | stay in the existing spreadsheets / Drive as read-only reference |

Only "had a contract in the preceding Year" is carried over from the past. It is the one fact AdAdd's rules depend on: it decides Continuing / New for the first Year (`spec/domain.md#Company Status`). From the second Year on, AdAdd computes it from its own contracts.

## Order

The order matters. Step 4 must come after step 1.

```text
0. Production database + first Administrator (above)
1. Create the first Year
2. Import Users
3. Register Sponsorship Menus
4. Import the curated Company CSV
5. Verify
6. Assign members and start UC-02
```

### 1. Create the first Year

Year List → create the Year (e.g. `2026`, start and end dates). It becomes the active Year. There are no Companies yet, so no Yearly Companies are generated.

Why first: the Company import registers Companies into the **active** Year and applies `previousYearContract` there. Without an active Year, a row marked `あり` is rejected, so the fact is never silently dropped (`spec/api.md#Bulk Import Companies`).

A Year cannot be deleted (`spec/domain.md#Year`). A wrong name or date can be corrected while the Year is active (`spec/domain.md#Correcting a Year`), but not after the next Year has been created.

### 2. Import Users

User List → CSV import (`spec/frontend.md#CSV Import / Export`). Grant Roles in the same CSV. Done before step 6 so members can be assigned.

### 3. Register Sponsorship Menus

Sponsorship Menu screen, for the first Year. Needed before any contract is created. Independent of steps 2 and 4.

### 4. Import the curated Company CSV

Prepare the CSV:

* Start from the template on the import dialog (Company List → CSV import). UTF-8. Header names must match exactly.
* One row per company. Remove duplicates **by hand**: names are compared exactly — `株式会社ＡＢＣ` and `株式会社ABC`, or a trailing space, make two different companies (`spec/database.md#Character Set and Collation`). Decide one notation per company (full/half width, 株式会社 position, spaces).
* `previousYearContract`: `あり` only for companies that had a sponsorship contract in the Year before the first Year (e.g. 2025 when the first Year is 2026). `なし` or empty for everyone else, including companies contacted but not contracted.
* `firstSponsorshipYear`, contacts, and `memo` (引継ぎ事項) as known.

Import:

1. Select the CSV. The preview shows each row's status (継続 / 新規) and every error row with its row number.
2. Check the number of 継続 rows against the number of `あり` rows in the file.
3. Confirm. All valid rows are created in one transaction — either all of them or none.
4. Fix the error rows and import a CSV with only those rows. Rows already created would show as duplicates.

### 5. Verify

* Yearly Company List (active Year): the number of companies equals the number of imported rows.
* Filter by 企業ステータス = 継続: the count equals the number of `あり` rows.
* Spot-check a few companies against the source spreadsheet.
* Export the Yearly Company List CSV and keep it with the source CSV as the migration record.

### 6. Assign members and start UC-02

Company assignment, advisor assignment, and phase classification proceed as usual (`spec/usecase.md` UC-02).

## Companies found later

After the migration, companies are added from Company List one by one or by CSV. While the Year is active they are registered into it. Use `なし` (or leave it empty) unless the company really had a contract in the preceding Year.

---

# Backup

**Undecided.** The method (tool, frequency, storage location, restore check) is not decided yet — `spec/decisions/0002-deployment.md` defers it, and it is tracked in Issue #169.

Until it is decided:

* The data lives in the MySQL server's data directory (with Docker Compose, the `mysql-data` volume). `docker compose down -v` deletes it.
* Take a manual dump before every risky operation (migration, CSV import, upgrade):

```bash
mysqldump --single-transaction --routines --default-character-set=utf8mb4 \
  -u adadd_prod -p adadd_prod > adadd_prod-YYYYMMDD.sql
```
