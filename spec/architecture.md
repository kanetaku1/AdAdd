# System Architecture

## Purpose

This document defines the overall system architecture of AdAdd.

It describes how the Frontend, Backend, Database, and External Services
work together to support the Sponsorship business.

This document does not describe business rules.
Business rules are defined in `spec/business.md` and `spec/domain.md`.

Related decision: `spec/decisions/0001-backend-language-framework.md`

---

# Overview

```text
                 ┌───────────────────┐
                 │      Browser       │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │   apps/web         │
                 │   Next.js          │
                 │   TypeScript       │
                 └─────────┬─────────┘
                           │ HTTP (REST)
                           ▼
                 ┌───────────────────┐
                 │   apps/api         │
                 │   Go / Echo        │
                 └─────────┬─────────┘
                           │ GORM
                           ▼
                 ┌───────────────────┐
                 │   MySQL            │
                 └───────────────────┘

apps/api also integrates with:

  Google Drive    (Advertisement file storage — metadata only)
  Google Forms    (Contract input method — not source of truth)
  Google Groups   (Email distribution — content not stored)
  Slack           (Assignee notification — outbound only, content not stored)
```

MySQL is always the Single Source of Truth.
Google Workspace services support existing operational workflows and never replace MySQL.

---

# Backend Architecture

## Tech Stack

* Language: Go
* Web Framework: Echo
* ORM: GORM
* Database: MySQL
* Local Development: Docker Compose

See `spec/backend.md` for layering and directory conventions.

## Responsibilities

* Owns all business logic.
* Exposes REST APIs as defined in `spec/api.md`.
* Persists domain state to MySQL via GORM.
* Stores only metadata/references for Google Drive files, not the files themselves.

Business logic must never live in the Frontend.

---

# Frontend Architecture

## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui

## Responsibilities

* Presents business state retrieved from `apps/api`.
* Contains no business logic (see `spec/development.md` Frontend Development Rules).

---

# Database

* MySQL is the Single Source of Truth.
* Schema is derived from `spec/database.md` (ER design) and `spec/model.md`.
* Schema changes are managed through migrations (see `spec/development.md` Database Development Rules).
* Google Sheets are only used for import/export and legacy workflow support, never as primary storage.

---

# Infrastructure

## Local Development

Docker Compose runs the services required for local development:

* `mysql` — MySQL 8.4
* `api` — apps/api (Go/Echo), once containerized

## Configuration

Environment-specific configuration (database connection, server port, etc.)
is provided through `.env` files and read by `apps/api` at startup.

Secrets are never committed to the repository.

---

# External Services

| Service        | Purpose                                   | System Responsibility            |
|----------------|--------------------------------------------|-----------------------------------|
| Google Drive   | Advertisement file storage                 | Store metadata and Drive reference only |
| Google Forms   | Contract input method                      | Import submitted data into MySQL  |
| Google Groups  | Email distribution for sponsorship contacts | None — email content is not stored |
| Slack          | Assignee notification (e.g. mention the Sponsorship Member assigned to a company when a Google Forms application is received) | Send notifications only — Slack is never read from, and message content is not stored |

The system does not send email, generate PDFs, or create advertisements.
These remain manual or external processes.

---

# Out of Scope

The following are explicitly not part of this architecture:

* Email delivery infrastructure
* Advertisement creation tooling
* PDF generation
* AI assistant integration
* Accounting / banking integration
