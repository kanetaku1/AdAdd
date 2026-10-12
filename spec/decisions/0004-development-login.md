# ADR-0004: Development Login and the Development Header Stub

## Status

Proposed — 2026-10-12

* Development login: agreed on the frontend side (2026-10-12).
* Development header stub: waiting for confirmation from the backend department
  (see Confirmation Required).

The specification (`spec/api.md`, `spec/frontend.md`, `spec/development.md`)
is updated after this ADR is accepted.

---

## Context

### Production login has two steps

`spec/api.md#Login` and `spec/frontend.md#Login` define production login as:

1. **Google sign-in.** It only proves that the visitor controls an email address.
2. **AdAdd session.** `apps/api` looks up the `User` by email, resolves Role codes
   from `UserRole`, and issues an AdAdd JWT. Next.js stores it in an httpOnly
   cookie and attaches it as `Authorization: Bearer` when it calls `apps/api`
   through `/api/proxy`.

Step 1 has already been confirmed to work with the registered Google OAuth client.

### The development header stub skips both steps

With `DEV_AUTH_ENABLED=true` (`apps/api`) and `NEXT_PUBLIC_DEV_AUTH_ENABLED=true` (`apps/web`),
the client sends `X-User-ID` / `X-User-Roles`, and `apps/api` trusts them as is.
It is used in:

| Place | Use |
| ----- | --- |
| `apps/api/internal/handler/auth_middleware.go` | Accepts the headers when no Bearer token is sent |
| `apps/api/internal/config/config.go` | `DEV_AUTH_ENABLED`, forced off unless `APP_ENV=development` |
| `apps/api/internal/integration` | Integration tests authenticate with the headers |
| `apps/web/src/lib/api/client.ts` | `apiFetch` always sends the headers; Role and user come from localStorage, or are fixed to `user_001` (Administrator) during SSR |
| `apps/web/src/proxy.ts` | The login guard is skipped |
| `apps/web/src/lib/auth/roles.ts` | Role gating is skipped; every control is shown |
| `apps/web/e2e`, `playwright.config.ts` | E2E tests act through the headers |
| `docker-compose.yml` | `DEV_AUTH_ENABLED: "true"` by default |

### Problems

1. **The session path is never exercised in development.**
   Issue #152: the Company list and Company edit screens call `apps/api` from
   Server Components without the session JWT. In production they would fail
   with `401`. The headers hide this in development and in E2E tests.
2. **Roles are self-declared.** The Role comes from localStorage, not from `UserRole`,
   and the UI shows every control regardless of Role.
   What a Member, Finance, or Advisor actually sees is not checked.
3. **A shared development server is planned.**
   Developers will use one development server on the local network, each with an
   account per Role. If `apps/api` there accepts the headers, anyone who can reach
   it can act as an Administrator by sending one header.
4. **Google sign-in per Role is impractical for developers.**
   Each developer would need a separate Google account for every Role.
   E2E tests cannot automate Google sign-in.

---

## Decision

### 1. Development login (agreed)

Development login replaces step 1 (Google sign-in) with an email and a shared password.
Step 2 (AdAdd session) is exactly the same as in production.

#### API

```
POST /auth/dev-login
```

Request:

```json
{
  "email": "tanaka@example.com",
  "password": "..."
}
```

* The password is compared with `DEV_LOGIN_PASSWORD` in constant time.
* After the password check, the behavior is the same as `POST /auth/google`:
  look up the `User` by email, resolve Role codes from `UserRole`, issue the same AdAdd JWT,
  and return the same response.
* Wrong password: `401 Unauthorized`, `error.code = "UNAUTHORIZED"`.
* Unknown email: `403 Forbidden`, `error.code = "FORBIDDEN"`, the same as `POST /auth/google`.

#### When it is enabled

* Only when `APP_ENV=development` **and** `DEV_LOGIN_PASSWORD` is set.
  Otherwise the route is not registered (`404`).
* `apps/api` refuses to start if `DEV_LOGIN_PASSWORD` is set while
  `APP_ENV` is not `development`, in the same way as a missing `JWT_SECRET`.

#### Password

* One password shared by all developers, held only in the environment variable `DEV_LOGIN_PASSWORD`.
* It is not stored in MySQL. The `User` model does not change.
  A password column would add a development-only concern to the domain model.

#### Accounts

The development seed users (`spec/development.md#Seed contents`) are used as they are:

| Role | User |
| ---- | ---- |
| Administrator | 田中 `tanaka@example.com` |
| Sponsorship Member | 鈴木 `suzuki@example.com`, 山田 `yamada@example.com` |
| Finance Department | 佐藤 `sato@example.com` |
| Advisor | 伊藤 `ito@example.com` |

#### Frontend

* `/login` shows a development login form only when development login is enabled.
  The Google sign-in button stays.
* A Next.js route handler posts to `POST /auth/dev-login` and stores the returned JWT
  in the same session cookie as Google login (`sessionCookieOptions`).
  The browser never sees the raw JWT.
* From then on, every request goes through the same session path as production:
  login guard, Role gating, `/api/proxy`, and `Authorization: Bearer`.

#### Never on real business data

Development login must not be enabled on any instance connected to real business data.
Anyone with the shared password could sign in as any registered User, including Administrators.
The shared development server uses fictitious data only (`spec/development.md#Development Seed`).

### 2. Development header stub (confirmation required)

Proposal:

* **Shared development server:** `DEV_AUTH_ENABLED=false`, always.
  The headers are never accepted there.
* **`apps/web`:** stop sending the headers.
  Remove `getDevAuthHeaders` from `apiFetch`, and the header-based bypasses in
  `proxy.ts` and `roles.ts`. Developers and E2E tests sign in with development login.
* **`apps/api`:** the backend department decides one of the options below.

| Option | Description |
| ------ | ----------- |
| A. Remove | Remove the header path from `AuthMiddleware` and `DEV_AUTH_ENABLED`. Integration tests issue JWTs with the test `JWTIssuer`. Only one authentication path remains. |
| B. Keep for automated tests only | Keep the header path for `apps/api/internal/integration`. `DEV_AUTH_ENABLED` defaults to `false`, including `docker-compose.yml`. |
| C. Keep as is | Not recommended. Problems 1–3 remain. |

The frontend side recommends **A**. If the integration tests need time to change, B first, then A.

---

## Confirmation Required

Questions for the backend department:

1. **Development login API.** Is the design above acceptable
   (path, request, error codes, enabling conditions, refusal to start outside development)?
2. **Development header stub in `apps/api`.** A, B, or C?
   For A: is switching the integration tests to JWTs issued by `JWTIssuer` acceptable?
3. **Shared development server settings.**
   * `APP_ENV=development` is required by development login and by the seed.
     Is that acceptable for the shared server?
   * Confirm `DEV_AUTH_ENABLED=false` there.
   * Confirm it connects to a database with fictitious data only, separate from
     the MySQL that holds real business data (ADR-0002).
4. **Default of `DEV_AUTH_ENABLED` in `docker-compose.yml`.** Change it to `false`?

---

## Relation to Issue #152

* With development login and the headers turned off, Issue #152 reproduces in development.
* Fix: the Company list and Company edit screens fetch from Client Components through
  `/api/proxy`, like the other screens (option B in the Issue).
  The SSR branch of `apiFetch`, which calls `apps/api` directly, is then unused and removed.
* E2E tests sign in with development login, so the session path is tested.
* The Issue's condition "development authentication behavior does not change" is replaced
  by this ADR. Development authentication moves to the session path.

---

## Alternatives Considered

### Real Google sign-in for every developer and Role

Closest to production, but each developer needs one Google account per Role,
and E2E tests cannot automate Google sign-in.
Google sign-in itself is already confirmed, so repeating it adds little.

### A password per User in MySQL

Lets each developer have a personal password, but adds a development-only column
and migration to the `User` domain model. A shared password is enough for
a development server with fictitious data.

### Keep only the header stub

No new code, but the session path stays untested (Issue #152),
and the shared development server cannot use it safely.

---

## Consequences

Specification:

* `spec/api.md`: Authentication (development login, the header stub), new section `POST /auth/dev-login`.
* `spec/frontend.md`: Login (development login form; remove "dev headers bypass this flow").
* `spec/development.md`: Development Seed and E2E Tests (sign in with development login),
  Integration Tests (depending on the option), shared development server settings.
* `README.md`: remove the statement that API authentication is a header stub.

Implementation:

* `apps/api`: `DEV_LOGIN_PASSWORD` in config and `.env.example`, `POST /auth/dev-login`,
  startup check, and tests.
* `apps/web`: development login form, route handler, `apiFetch`, `proxy.ts`, `roles.ts`, `.env.example`.
* E2E: `playwright.config.ts` and `e2e/support.ts` sign in through development login.
* Issue #152 is fixed as described above.
