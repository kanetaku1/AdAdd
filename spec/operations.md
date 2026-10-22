# Production Operations

## Purpose

How AdAdd is set up and run for real operation: the production database, the first Administrator, loading the existing business data, and upgrading to a new version.

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

The collation is `utf8mb4_0900_bin` (`spec/database.md#Character Set and Collation`). The baseline migration (`0001_baseline.up.sql`) sets it as well, so a database created with another default is corrected when the baseline is applied (`cmd/migrate up`, below).

## Start the API against it

Point the API at the database with environment variables (`apps/api/.env.example`):

| Variable | Value |
| -------- | ----- |
| `DB_HOST` / `DB_PORT` | MySQL host and port |
| `DB_USER` / `DB_PASSWORD` | the user created above |
| `DB_NAME` | `adadd_prod` |
| `MIGRATE_ON_START` | `false` (the default) — production never changes its schema just by starting |

Migrations are applied as an explicit step with `cmd/migrate`, after a backup (see Upgrading Production). Create the schema of the new, empty database the same way:

```bash
# from apps/api, with the DB_* settings above
go run ./cmd/migrate status
go run ./cmd/migrate up -database adadd_prod
```

In the Docker image the same command is `./migrate`.

The API checks the database on start and refuses to start when its schema does not match the code: a pending migration, a `dirty` state, or a version with no migration file. The error names the state; `cmd/migrate status` shows the details. New code therefore never runs against an old schema because the apply step was forgotten.

Production must not run with development authentication. Production settings (`APP_ENV`, `JWT_SECRET`, network exposure) are tracked in Issue #156 and must be in place before real data is loaded.

## Never run against the production database

* `go run ./cmd/seed` — it creates fictional companies, users, and Years (`spec/development.md#Development Seed`).
* Go integration tests and Playwright E2E — they empty tables. Their database names must end with `_test` / be the dedicated E2E database.

---

# First Administrator

An empty production database has no User, so nobody can sign in. Users and Roles are normally granted from User List, which only an Administrator can open. The very first Administrator is therefore inserted directly with SQL.

This is the only direct write to the production database allowed by this document (`spec/development.md#Migration First`). Every later User, including more Administrators, is added from User List.

## Steps

1. Apply the migrations (`go run ./cmd/migrate up -database adadd_prod`, above), so the tables and the fixed Roles exist.
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

A Year cannot be deleted (`spec/domain.md#Year`), and correcting its name or dates is not designed yet (Issue #172). Check them before creating it.

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

# Upgrading Production

Every release that adds a migration changes the production schema. The database is never recreated, and `schema_migrations` is never edited by hand. Changes only go forward, one new migration at a time (`spec/development.md#Migration Numbering`).

## Steps

```text
1. Back up
2. Rehearse on a copy
3. Stop the API
4. Apply
5. Start the new version and verify
6. Resume work
```

### 1. Back up

Take a dump right before the change (see Backup below). It is the way back if anything fails. Keep it until the new version has run without problems.

### 2. Rehearse on a copy

Restore the dump into a separate database (e.g. `adadd_rehearsal`) and run the new version against it. A migration that fails or breaks real data shows up here, not in production.

```bash
mysql -u root -p -e "CREATE DATABASE adadd_rehearsal CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;"
mysql -u root -p adadd_rehearsal < adadd_prod-YYYYMMDD.sql
```

Then, with **`DB_NAME=adadd_rehearsal`** (and a user granted on it) in place of the production settings, so that nothing below touches `adadd_prod`:

```bash
go run ./cmd/migrate up -database adadd_rehearsal
go run ./cmd/server   # sign in and try the main screens
```

`up` refuses to run if `-database` and `DB_NAME` differ, so a forgotten `DB_NAME` stops here instead of changing production. Drop the copy afterwards — it holds real data.

### 3. Stop the API

No one writes while the schema changes. A short stop is acceptable at AdAdd's scale; tell the members beforehand.

### 4. Apply

```bash
go run ./cmd/migrate status
go run ./cmd/migrate up -database adadd_prod
```

`status` lists the pending migrations. `up` refuses to run unless `-database` names the configured `DB_NAME`, and refuses a dirty or unknown state.

### 5. Start the new version and verify

* `go run ./cmd/migrate status` shows `state: clean` and `pending: none`.
* Start the new version. It refuses to start if the schema does not match (see Start the API against it).
* Sign in and check the screens the change touches.

### 6. Resume work

Tell the members they can use AdAdd again.

## When it fails

| Situation | What to do |
| --------- | ---------- |
| `up` failed; `status` shows `DIRTY` | MySQL cannot roll DDL back, so the schema may be half-changed. Restore the step 1 dump into the production database and start the **previous** version. Fix the migration in a new PR, then repeat from step 2. Never clear `dirty` by hand. |
| Applied cleanly, but the new version has a bug | Fix forward: release a correction (a new migration if the schema must change). Restore the dump only if data was damaged — writes made since the dump are lost, so agree on it with the members first. |
| `status` shows `UNKNOWN` | The database records a version with no file — the running code is older than the database. Use the matching version of the code; do not edit `schema_migrations`. |

There are no down migrations to roll back with (`spec/development.md#Up only`).

---

# Backup

**Undecided.** The method (tool, frequency, storage location, restore check) is not decided yet — `spec/decisions/0002-deployment.md` defers it, and it is tracked in Issue #169.

Until it is decided:

* The data lives in the MySQL server's data directory (with Docker Compose, the `mysql-data` volume). `docker compose down -v` deletes it.
* Take a manual dump before every risky operation (CSV import, every upgrade — see Upgrading Production):

```bash
mysqldump --single-transaction --routines --default-character-set=utf8mb4 \
  -u adadd_prod -p adadd_prod > adadd_prod-YYYYMMDD.sql
```
