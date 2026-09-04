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

Optional (UC-16 Slack mention). Both must be set or sending is a no-op:

```text
SLACK_BOT_TOKEN
SLACK_CHANNEL_ID
```

Create the workspace app from [`apps/api/slack-app-manifest.yaml`](../apps/api/slack-app-manifest.yaml) (see Slack App below). Do not commit tokens.

---

# Slack App

Outbound mention only (`chat.postMessage`). AdAdd does not receive Slack events. Scope is `chat:write` — invite the bot to the notify channel; do not use `chat:write.public`.

## Create from manifest

1. Open [https://api.slack.com/apps](https://api.slack.com/apps) (workspace admin or an allowed developer).
2. **Create New App** → **From an app manifest**.
3. Pick the 技大祭 / committee workspace.
4. Paste the contents of `apps/api/slack-app-manifest.yaml`.
5. **Create**.

## Install and copy secrets

1. **OAuth & Permissions** → **Install to Workspace** → allow.
2. Copy **Bot User OAuth Token** (`xoxb-…`) into `SLACK_BOT_TOKEN`. With `docker compose`, that is the **repo-root** `.env` (Compose substitutes into the container). `apps/api/.env` is only for `go run` from `apps/api`.
3. Create a channel for AdAdd notices (e.g. `#協賛-通知`). In Slack, open channel details and copy the **Channel ID** (`C…`) into `SLACK_CHANNEL_ID`.
4. In that channel: `/invite @AdAdd`.

Without the invite, `chat.postMessage` returns `not_in_channel`. Restart `apps/api` after changing env (the Slack client is created once at first notify).

## Member Slack IDs

`User.slackId` is the Slack **Member ID** (`U…`), not a display name or email. In Slack: profile → ⋯ → **Copy member ID**. Store it on the User List (`spec/frontend.md#User List`). Members with an empty `slackId` are skipped.

A mention looks like: `<@U01234567> 株式会社長岡テクノ の協賛が確定しました。`

---

# Health Check

`GET /health` returns process liveness only.

It does not verify database connectivity or business availability.

---

# Out of Scope (This Document)

* API request/response contracts — see `spec/api.md`
* Database schema — see `spec/database.md`
* Business rules — see `spec/business.md`, `spec/domain.md`
