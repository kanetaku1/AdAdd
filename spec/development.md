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
- Company Management Department only
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
