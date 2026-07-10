# ADR-0001: Backend Language and Framework Selection

## Status

Accepted — 2026-07-11

---

## Context

README.md originally listed the Backend tech stack as FastAPI (Python).

Before starting Backend implementation, this choice was reconsidered.

Business, Domain, Database, and API design (`spec/business.md`, `spec/domain.md`,
`spec/database.md`, `spec/api.md`) were already completed and are framework-agnostic.

`spec/architecture.md` and `spec/backend.md` were still empty at this point,
meaning the Architecture phase for the backend had not yet been finalized.

---

## Decision

The Backend will be implemented using:

* Go
* Echo (Web Framework)
* GORM (ORM)
* MySQL
* Docker Compose (local development)

FastAPI / Python is no longer the Backend tech stack for this project.

---

## Reasons

### Type Safety and Performance

Go's static typing and compiled performance reduce runtime errors and fit
a business system where data consistency matters.

### Deployment and Operations Simplicity

Go compiles to a single binary, which simplifies containerization and
deployment compared to a Python runtime with dependency management.

---

## Consequences

* `README.md` Backend section is updated to reflect Go / Echo / GORM.
* `spec/architecture.md` documents the overall system architecture based on this decision.
* `spec/backend.md` documents Backend-specific layering and directory conventions.
* `spec/business.md`, `spec/domain.md`, `spec/database.md`, `spec/api.md` are unaffected,
  since they describe business and data concepts independent of implementation language.
