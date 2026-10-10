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
  "CREATE DATABASE IF NOT EXISTS adadd_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON adadd_test.* TO 'adadd'@'%';"
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

### Seed contents

| Data | Contents |
| ---- | -------- |
| Users | `user_001` 田中 (Administrator), `user_002` 鈴木 / `user_005` 山田 (Sponsorship Member), `user_003` 佐藤 (Finance), `user_006` 伊藤 (Advisor), `user_004` 高橋 (inactive, no Role). IDs match the frontend development stub (`X-User-ID`). |
| Years | `year_2025` (previous), `year_2026` (active) |
| Companies | `c_001`–`c_003` existed in 2025. `c_004`, `c_005` were registered afterward. |
| 2025 | `c_001` and `c_002` have contracts with confirmed Payments. `c_003` was contacted and declined. |
| 2026 `companyStatus` | `c_001`, `c_002` Continuing. `c_003`, `c_004`, `c_005` New. |
| 2026 assignments | `c_001`, `c_003` → 鈴木. `c_002` → 山田. `c_004`, `c_005` unassigned. 伊藤 advises 鈴木 and 山田. |
| 2026 contract | `c_001`: pamphlet ad, homepage ad, and a goods sponsorship booth (total 95,000). Payment waiting for Finance. |

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

---

# Final Rule

The specification documents are the source of truth.

When implementation and specification conflict:

1. Stop implementation.
2. Discuss the requirement.
3. Update specification.
4. Update implementation.

Do not silently change the business logic in code.
