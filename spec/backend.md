# Backend Design

## Purpose

This document defines the internal design conventions for `apps/api`.

It describes layering and directory structure only.
It does not define business rules or API contracts — see `spec/domain.md` and `spec/api.md`.

Tech stack decision: `spec/decisions/0001-backend-language-framework.md`

---

# Tech Stack

* Go
* Echo (Web Framework)
* GORM (ORM)
* MySQL

---

# Layering

Following `spec/development.md` API Development Rules:

```text
Usecase
    ↓
Handler   (Echo routes / HTTP request-response)
    ↓
Service   (Business logic)
    ↓
Repository (Data access)
    ↓
Model     (GORM entities)
    ↓
Database  (MySQL)
```

## Layer Responsibilities

### Handler

* Parses HTTP requests and writes HTTP responses.
* Contains no business logic.
* Delegates to Service.

### Service

* Contains business logic and domain rules.
* Orchestrates one or more Repositories.
* Independent of Echo/HTTP concerns.

### Repository

* Encapsulates GORM queries.
* Returns domain models, not raw database rows.

### Model

* GORM entities representing domain objects (e.g. `YearlyCompany`, `SponsorshipContract`).
* Named after domain terminology — see Naming Rules in `CLAUDE.md`.

---

# Directory Structure

```text
apps/api/
├── cmd/
│   └── server/
│       └── main.go        # Application entry point
│
├── internal/
│   ├── handler/            # Echo handlers
│   ├── service/             # Business logic
│   ├── repository/          # Data access (GORM)
│   ├── model/                # GORM entities
│   └── config/                # Environment / configuration loading
│
├── go.mod
├── go.sum
├── .env.example
└── Dockerfile
```

`internal/` is used so these packages are not importable outside `apps/api`.

---

# Configuration

Configuration is loaded from environment variables (`.env` in local development).

Required variables (local development):

```text
APP_PORT
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

Values must match the `mysql` service defined in `docker-compose.yml`.

---

# Health Check

`GET /health` returns process liveness only.

It does not verify database connectivity or business availability.

---

# Out of Scope (This Document)

* API request/response contracts — see `spec/api.md`
* Database schema — see `spec/database.md`
* Business rules — see `spec/business.md`, `spec/domain.md`
