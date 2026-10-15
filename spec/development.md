# Development Guide

## Purpose

This document defines development rules and workflows for the AdAdd project.

The goal is to enable consistent team development using AI coding assistants while maintaining software quality and domain consistency.

---

# Development Principles

## 1. Specification First

All implementation decisions must follow the specification documents.

Priority order:

```text
spec/
    ↓
Implementation
    ↓
Tests
```

Developers and AI assistants must read related specifications before implementation.

---

## 2. Domain-Driven Development

The implementation must reflect business concepts.

Do not create technical names that do not exist in the domain.

Example:

Bad:

```text
SponsorData
```

Good:

```text
YearlyCompany
SponsorshipContract
ContractMenu
```

---

## 3. AI as Development Partner

AI assistants are used for:

* Code generation
* Refactoring
* Test generation
* Documentation generation
* Design discussion

AI-generated code must always be reviewed by humans before merging.

---

# Repository Structure

```text
AdAdd/

├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│
├── spec/
│
├── docs/
│
├── docker-compose.yml
│
├── README.md
└── CLAUDE.md
```

---

# Branch Strategy

## Main Branch

```text
main
```

Purpose:

* Production-ready code only

---

## Development Branch

```text
develop
```

Purpose:

* Integration branch

---

## Feature Branch

Format:

```text
feature/{feature-name}
```

Examples:

```text
feature/company-management

feature/sponsorship-contract

feature/payment-management
```

---

## Bug Fix Branch

Format:

```text
fix/{bug-name}
```

Example:

```text
fix/login-error
```

---

# Commit Rules

Commit messages must follow Conventional Commits.

Format:

```text
type: description
```

---

## Types

### feat

New feature

Example:

```text
feat: add company assignment API
```

---

### fix

Bug fix

Example:

```text
fix: correct payment status update
```

---

### docs

Documentation changes

Example:

```text
docs: update domain specification
```

---

### refactor

Code improvement without behavior change

Example:

```text
refactor: simplify contract service
```

---

### test

Test changes

Example:

```text
test: add company service tests
```

---

# Pull Request Rules

All changes must be merged through Pull Requests.

---

## PR Requirements

A Pull Request must include:

* Purpose
* Related specification
* Implementation summary
* Test results

Template:

```markdown
## Purpose

## Related Spec

## Changes

## Test

## Notes
```

---

# Specification Update Rules

When changing business behavior, update specifications first.

Required update flow:

```text
Business Change

↓

business.md

↓

domain.md

↓

model.md

↓

er.md

↓

database.md

↓

api.md

↓

frontend.md

↓

Implementation
```

---

# Entity Change Rules

When adding or modifying an entity:

Required documents:

```text
domain.md
model.md
er.md
database.md
api.md
```

must be updated.

Example:

Adding:

```text
Notification
```

requires updating all related documents.

---

# Database Development Rules

## Migration First

Database changes must be managed through migrations.

Do not directly modify production databases.

---

## Migration Numbering

Migrations live in `apps/api/migrations` as `NNNN_snake_case.up.sql`, numbered in sequence. `0001_baseline.up.sql` is the whole schema at the start of production (see Baseline below). Every later change is a new file from `0002` on.

### Up only

There are no down migrations. The API and the tests only ever apply migrations forward (`m.Up()`), and a down file is never run. Many changes cannot be undone exactly anyway (dropped columns, deleted rows).

* A mistake in a merged migration is fixed with a new migration.
* The production database is rolled back by restoring a backup taken before the change (`spec/operations.md#Backup`), not by a down migration.
* A local database is recreated (`spec/development.md#Development Seed`).

### Why the number matters

golang-migrate records only the latest applied version, not each applied file. A migration whose number is lower than one already applied is **never applied, and no error is raised**. If PR A adds `0003` and PR B adds `0002`, and A is merged first, every database already at `0003` silently skips B's `0002`.

### Rules

1. **A new migration takes the next number after the largest one on `main` at merge time.** Two open PRs may pick the same number while they are in progress.
2. **Whichever PR merges second renumbers.** Merge `main` into the branch, rename the file to the next free number, and run the tests again. Only the file name changes.
3. **Never change, rename, or delete a migration that is on `main`.** It may already be applied on the production database. Fix a mistake with a new migration.
4. A migration may depend on tables that exist only after another PR's migration. Then the merge order between those PRs is fixed. Say so in both PR descriptions.

### Check

`apps/api/scripts/check-migrations.sh <base>` enforces the rules. It fails when:

* a file is not `NNNN_snake_case.up.sql`, or a number is shared
* an added migration's number is not above the largest in `<base>`
* a migration in `<base>` was changed, renamed, or deleted

CI (`.github/workflows/api-ci.yml`, job `migrations`) runs it on every pull request against its base branch. It also runs on every push against the previous tip, so a check that went stale before merge still fails on `main`.

Run it locally before pushing:

```bash
git fetch origin
apps/api/scripts/check-migrations.sh origin/main
```

### A local database that ran an unmerged migration

If you applied another branch's migration on your local database and that migration was renumbered later, your database records a version that no longer matches. Do not patch `schema_migrations` by hand. Recreate the local database (`spec/development.md#Development Seed`). Tell the team when others may be in the same state.

---

## Baseline

Before any production data existed, the development-era migrations `0001`–`0012` (with their down files) were squashed into one file, `0001_baseline.up.sql`. It creates the same schema they produced — every column, default, index, foreign key, collation, and the four Roles — checked by comparing `information_schema` of both databases.

Why: a new database, including the production one, is built from the finished schema instead of replaying the development history (7 Roles created then 3 deleted, columns added then dropped, tables converted to another collation).

This was a one-time exception to rule 3, allowed only because no production database existed yet. It is never repeated: once the production database is running, its applied migrations are permanent.

### Moving a local database to the baseline

A local database created before the squash records version `12`, which no longer has a file. The API then stops on start with `no migration found for version 12`. Do one of these, once:

* **The database was at version 12 cleanly** (it ran every migration up to `0012_use_binary_collation`): its schema already equals the baseline. Record the new version:

```sql
UPDATE schema_migrations SET version = 1 WHERE version = 12 AND dirty = 0;
```

* **Any other version, `dirty = 1`, or a migration from an unmerged branch** (e.g. the old `contract_menu_files` from the closed PR #139): recreate the database. This deletes all local data.

```bash
docker exec adadd-mysql mysql -uroot -proot_password -e \
  "DROP DATABASE adadd; CREATE DATABASE adadd CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin; GRANT ALL PRIVILEGES ON adadd.* TO 'adadd'@'%';"
```

Then, from `apps/api`, `go run ./cmd/seed` applies the baseline and loads the development data (`spec/development.md#Development Seed`).

Check the current state with `SELECT version, dirty FROM schema_migrations;`. The same applies to the local E2E database (`adadd_e2e`). The integration test database is rebuilt by the tests themselves.

---

## Schema Rules

* Table names use snake_case
* Primary keys use UUID
* Foreign keys must be explicitly defined
* Soft delete policy must be considered

Example:

```text
yearly_companies

id
year_id
company_id
created_at
updated_at
```

---

# API Development Rules

## API Design

API design must follow:

```text
Usecase

↓

API

↓

Service

↓

Repository

↓

Database
```

---

Do not expose database structure directly.

Bad:

```text
GET /contract_menus
```

Good:

```text
GET /contracts/{id}/menus
```

---

# Frontend Development Rules

## Component Design

Components should be divided by responsibility.

Example:

```text
CompanyPage

├── CompanyList
├── CompanyFilter
└── CompanyDetail
```

---

## Business Logic

Business logic must not exist inside UI components.

Bad:

```typescript
if(status==="PAID")
```

inside React component.

Good:

```text
PaymentService
```

handles business rules.

---

# Testing Rules

## Required Tests

Each feature should include:

* Unit tests
* API tests
* Integration tests when necessary

---

## Test Priority

Priority order:

1. Domain rules
2. Business logic
3. API behavior
4. UI behavior

---

## Integration Tests

Domain rules and business flows are verified against a real MySQL, not mocks.

* `apps/api/internal/testdb` connects a test to the database named by `ADADD_API_TEST_DSN`.
  * On first use in a test binary, it drops every table and applies all migrations from scratch. A broken or conflicting migration fails the tests.
  * Before every test, it empties all tables except `schema_migrations` and `roles` (Roles are master data seeded by migrations).
  * The database name must end with `_test`. Any other name is refused, because every table is dropped.
* `apps/api/internal/integration` tests business flows through the full API (routing, role checks, handlers, services, MySQL), authenticated with the development `X-User-ID` / `X-User-Roles` headers.
* Without `ADADD_API_TEST_DSN`, these tests are skipped locally. In CI (`CI=true`) they fail instead, so they are never skipped silently.
* Packages share one test database, so run tests with `-p 1`.

CI (`.github/workflows/api-ci.yml`) runs them against a MySQL 8.4 service container on every API change.

### Running locally

With the Docker Compose `mysql` service running, create the test database once:

```bash
docker exec adadd-mysql mysql -uroot -proot_password -e \
  "CREATE DATABASE IF NOT EXISTS adadd_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin; GRANT ALL PRIVILEGES ON adadd_test.* TO 'adadd'@'%';"
```

Then, from `apps/api`:

```bash
ADADD_API_TEST_DSN='adadd:adadd_password@tcp(127.0.0.1:3306)/adadd_test' go test -p 1 ./...
```

---

## Development Seed

`apps/api/cmd/seed` loads fictitious development data, so the API, the frontend in API mode, and E2E tests can start from a known state.

* All data is fictitious. Real companies, people, or payment data must never be added.
* Every row has a fixed ID and each step only creates what is missing. Running the seed again leaves the database unchanged.
* Business state is created through the services, so it follows the real business rules (Yearly Company generation and `companyStatus`, contract totals, Payments, Activity Logs).
* It refuses to run unless `APP_ENV=development`, and it never sends Slack notifications.
* It applies migrations before loading data.

From `apps/api`, with the database settings in `apps/api/.env` (see `.env.example`):

```bash
go run ./cmd/seed
```

The seed is meant for an empty development database. Creating Year 2026 makes it the active Year and generates a Yearly Company for every Company already in the database.

The seed only checks IDs. Do not run it against a database that already has a Year named 2025 or 2026 under another ID: it would add a second Year with the same name and make it active.

### Seed contents

| Data | Contents |
| ---- | -------- |
| Users | `user_001` 田中 `tanaka@example.com` (Administrator), `user_002` 鈴木 `suzuki@example.com` / `user_005` 山田 `yamada@example.com` (Sponsorship Member), `user_003` 佐藤 `sato@example.com` (Finance), `user_006` 伊藤 `ito@example.com` (Advisor), `user_004` 高橋 `takahashi@example.com` (inactive, no Role). E2E tests act as them. IDs match the frontend mock Users. |
| Years | `year_2025` (previous), `year_2026` (active) |
| Companies | `c_001`–`c_003` existed in 2025. `c_004`, `c_005` were registered afterward. |
| 2025 | `c_001` and `c_002` have contracts with confirmed Payments. `c_003` was contacted and declined. |
| 2026 `companyStatus` | `c_001`, `c_002` Continuing. `c_003`, `c_004`, `c_005` New. |
| 2026 assignments | `c_001`, `c_003` → 鈴木. `c_002` → 山田. `c_004`, `c_005` unassigned. 伊藤 advises 鈴木 and 山田. |
| 2026 contract | `c_001`: pamphlet ad, homepage ad, and a goods sponsorship booth (total 95,000). Payment waiting for Finance. |

---

## E2E Tests

`apps/web/e2e` verifies the main business flows through the browser, on the real stack: Next.js (API mode) → Go API → MySQL.

* Playwright (`apps/web/playwright.config.ts`) starts both servers itself:
  * the Go API on port 18080 against the `adadd_e2e` database, after running the development seed;
  * the production build of the web app (`next build` + `next start`) on port 3100.
* A local development API on port 8080 and its database are never touched.
* Tests act as seed Users by signing a session JWT for them with the API's `JWT_SECRET` (set by `playwright.config.ts`) and storing it in the session cookie (`spec/decisions/0004-development-modes-and-sessions.md`). Every request takes the production session path (session cookie → `/api/proxy` → `Authorization: Bearer` → User and Roles read from MySQL). Only Google sign-in itself is not covered. The development header stub is off, and the UI shows controls by the User's Roles.
* Tests create their own companies with unique names, so they do not need a fresh database and can be run repeatedly.
* Each step is checked again after a reload, so the result is read back from MySQL.

CI (`.github/workflows/e2e.yml`) runs them against a MySQL 8.4 service container on every API or web change.

### Covered flows

| Flow | Checks |
| ---- | ------ |
| Yearly Company list | Seeded companies appear in the active Year with Continuing / New |
| Company → Yearly Company | Register a company, register it in the active Year (New) |
| Assignment | An Administrator assigns a member; it persists after reload |
| Contract | A Sponsorship Member creates a contract with menus; total and Payment (waiting) persist |
| Payment confirmation | A Sponsorship Member cannot open the status for editing; Finance confirms; status and confirmer persist |
| Master data deletion | An Administrator deletes a company and a menu after confirming; a Sponsorship Member sees no delete control; a company registered in a Year is rejected |
| Session | No session or a rejected session leads to `/login`; a deactivated User is sent to `/login`; Company list and Company edit load with a session (Issue #152) |

### Running locally

With the Docker Compose `mysql` service running, create the E2E database once:

```bash
docker exec adadd-mysql mysql -uroot -proot_password -e \
  "CREATE DATABASE IF NOT EXISTS adadd_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin; GRANT ALL PRIVILEGES ON adadd_e2e.* TO 'adadd'@'%';"
```

Then, from `apps/web` (Go and Node are required):

```bash
npx playwright install chromium   # first time only
npm run test:e2e
```

---

# AI Development Workflow

## Before Asking AI

Provide:

1. Related specification files
2. Current implementation context
3. Expected behavior
4. Constraints

Example:

Good prompt:

```text
Implement UC-05 Company Assignment.

Read:
- spec/usecase.md
- spec/domain.md
- spec/database.md

Requirements:
- Administrator only
- Must create ActivityLog
```

---

## After AI Generation

Review:

* Domain consistency
* Security
* Error handling
* Test coverage
* Specification compliance

---

# Issue Management

All development tasks should be managed using GitHub Issues.

Issue template:

```markdown
## Purpose

## Related Usecase

## Related Specification

## Acceptance Criteria

## Notes
```

---

# Definition of Done

A task is complete when:

* [ ] Specification is satisfied
* [ ] Implementation is completed
* [ ] Tests pass
* [ ] Code review is completed
* [ ] Related documentation is updated
* [ ] Pull Request is merged

---

# Development Environment

Recommended:

## Backend

* MySQL
* Docker
* ORM
* API Framework

## Frontend

* TypeScript
* Next.js
* Tailwind CSS

## Tools

* GitHub
* Claude Code
* VS Code

## Development Modes

AdAdd runs in one of two modes during development (`spec/decisions/0004-development-modes-and-sessions.md`).

| | Mock mode | MySQL mode |
| - | --------- | ---------- |
| Start | `npm run dev:mock` in `apps/web` | `docker compose up -d`, then `npm run dev` in `apps/web` |
| Data | In-memory mock data (lost on reload) | Local MySQL through `apps/api` |
| Sign-in | Choose a Role's User on `/login` (no Google, no password) | Google sign-in |
| Role gating | Applied | Applied |
| Use | Checking each Role's screens; the Vercel preview (ADR-0002) | Checking the real flow as in production |

In MySQL mode, a developer's Google account must be registered both as a test user of the AdAdd OAuth client and as an AdAdd `User` with the Roles to check. After the first sign-in, the session is renewed while in use and ends after 30 days without use.

### Environment variables

`apps/web/.env` (see `apps/web/.env.example`):

| Variable | Mock mode | MySQL mode | Purpose |
| -------- | --------- | ---------- | ------- |
| `NEXT_PUBLIC_API_BASE_URL` | Empty (`dev:mock` sets it) | `http://127.0.0.1:8080` | Empty means mock mode |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Required | Google sign-in |
| `GOOGLE_API_KEY` / `GOOGLE_DRIVE_ROOT_FOLDER_ID` | — | When using Drive | Drive Picker (exposed to the browser by `next.config.ts`) |
| `NEXT_PUBLIC_DEV_AUTH_ENABLED` | — | Unset | Development header stub (pending, ADR-0004) |

`apps/api` — the repository-root `.env` for Docker Compose (see `.env.example`), or `apps/api/.env` for `go run` (see `apps/api/.env.example`):

| Variable | Purpose |
| -------- | ------- |
| `APP_ENV` | `development` locally. Production must set it explicitly; unset means `development`. |
| `JWT_SECRET` | Signs session JWTs. Unset falls back to an insecure value in development only. |
| `GOOGLE_CLIENT_ID` | Verifies Google id_tokens (same value as in `apps/web`). |
| `DB_*`, `MIGRATE_ON_START`, `MIGRATIONS_PATH`, `APP_PORT`, `ALLOWED_ORIGINS` | Database and server. |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Drive folder for ad material files. |
| `SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` | Optional Slack mention (UC-16). |
| `DEV_AUTH_ENABLED` | Development header stub (pending, ADR-0004). Never on a shared server or in production. |

E2E tests set their own values in `apps/web/playwright.config.ts` (`E2E_*` overrides the ports and database).

---

# Final Rule

The specification documents are the source of truth.

When implementation and specification conflict:

1. Stop implementation.
2. Discuss the requirement.
3. Update specification.
4. Update implementation.

Do not silently change the business logic in code.
