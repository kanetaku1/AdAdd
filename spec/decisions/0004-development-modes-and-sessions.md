# ADR-0004: Development Modes, Sessions, and the Development Header Stub

## Status

Accepted — 2026-10-12, revised 2026-10-13, 2026-10-14, and 2026-10-24

* Development modes, session checks, and the removal of development login:
  decided on the frontend side (2026-10-13).
* Session renewal and easier re-login (Decisions 8 and 9): decided on the frontend side (2026-10-14).
* Development header stub: removed (Decision 7, option A — 2026-10-24, Issue #156).

The specification (`spec/api.md`, `spec/frontend.md`, `spec/development.md`)
reflects every decision.

### Revision history

* 2026-10-12: proposed a development login (`POST /auth/dev-login`) with an email and a
  password shared by all developers.
* 2026-10-13: replaced it. Developers check each Role's screens in mock mode, and the
  MySQL mode uses Google sign-in only. Development login was removed before release.
* 2026-10-14: sessions are renewed while in use, and re-login skips Google's account chooser.
  Committee members use their own PCs and phones, so a session that ends after 30 days without
  use is enough; per-session revocation is not adopted.
* 2026-10-24: the development header stub is removed (option A). Signing in with Google as a
  User registered in AdAdd and as an OAuth test user is enough to check a Role's screens
  against MySQL. Found again in the production check (Issue #156): `docker-compose.yml` turned
  the stub on, so a request with only `X-User-Roles: ADMINISTRATOR` acted as an Administrator.

---

## Context

### Production login has two steps

`spec/api.md#Login` and `spec/frontend.md#Login` define production login as:

1. **Google sign-in.** It only proves that the visitor controls an email address.
   Only Google accounts registered as test users of the AdAdd OAuth client can sign in.
2. **AdAdd session.** `apps/api` looks up the `User` by email and issues an AdAdd JWT.
   Next.js stores it in an httpOnly cookie and attaches it as `Authorization: Bearer`
   when it calls `apps/api` through `/api/proxy`.

### Two ways to run AdAdd during development

| Mode | Data | Login before this ADR |
| ---- | ---- | --------------------- |
| Mock mode (`NEXT_PUBLIC_API_BASE_URL` unset) | In-memory mock data; also the Vercel preview (ADR-0002) | Skipped. Every control is shown regardless of Role. |
| MySQL mode | Local MySQL through `apps/api` | Google sign-in, or the development header stub |

### The development header stub skips both steps

With `DEV_AUTH_ENABLED=true` (`apps/api`) and `NEXT_PUBLIC_DEV_AUTH_ENABLED=true` (`apps/web`),
the client sends `X-User-ID` / `X-User-Roles`, and `apps/api` trusts them as is.
It is used in:

| Place | Use |
| ----- | --- |
| `apps/api/internal/handler/auth_middleware.go` | Accepts the headers when no Bearer token is sent |
| `apps/api/internal/config/config.go` | `DEV_AUTH_ENABLED`, forced off unless `APP_ENV=development` |
| `apps/api/internal/integration` | Integration tests authenticate with the headers |
| `apps/web/src/lib/api/client.ts` | `apiFetch` sends the headers; Role and user come from localStorage |
| `apps/web/src/proxy.ts` | The login guard is skipped |
| `apps/web/src/lib/auth/roles.ts` | Role gating is skipped; every control is shown |
| `docker-compose.yml` | `DEV_AUTH_ENABLED: "true"` by default |

### Problems

1. **The session path was never exercised in development.**
   Issue #152: the Company list and Company edit screens called `apps/api` from
   Server Components without the session JWT. In production they would fail with `401`.
   A second case was found: `AuthMiddleware` (`e.Use`) also ran on `POST /auth/google`
   and `/health`, so Google login itself returned `401` whenever the header stub was off.
   The header stub, which lets requests without any credentials through, hid both.
2. **Roles were self-declared or ignored.** With the header stub the Role comes from
   localStorage, and in mock mode every control is shown.
   What a Member, Finance, or Advisor actually sees was not checked.
3. **A JWT stayed valid after access was removed.** The JWT carried the Role codes and lived
   30 days. `AuthMiddleware` trusted it without reading MySQL, so a deactivated User or a
   revoked Role kept working until the token expired.
4. **Inactive Users were stopped only by Google.** `POST /auth/google` did not check
   `User.isActive`. Today a deactivated member is also removed from the OAuth test users,
   but once the OAuth client is published, any Google account passes Google sign-in.

---

## Decision

### 1. Mock mode: sign in by choosing a Role

* `npm run dev:mock` starts the frontend in mock mode (`NEXT_PUBLIC_API_BASE_URL` empty).
* `/login` lists one button per mock User with a Role (Administrator, Sponsorship Member,
  Finance Department, Advisor). There is no password: everything runs in the browser on
  fictitious data, and the Vercel preview is public, so a password would protect nothing.
* Choosing a User stores its ID in a cookie (`adadd_mock_user`). Logging out removes it.
* The login guard and Role gating apply in mock mode the same way as in MySQL mode.
  Mock writes that record "who did it" (Activity Logs, payment confirmation) use this User.
* This replaces "login and Role gating are skipped in mock mode" (ADR-0002, `spec/frontend.md`).

### 2. MySQL mode: Google sign-in only

* Every developer signs in with Google, as in production. The account must be registered both as
  a test user of the OAuth client and as an AdAdd `User`.
* After the first sign-in, the AdAdd session keeps the developer signed in (Decision 8).
  Google is needed again only after logging out or 30 days without use.

### 3. Sessions are checked against MySQL on every request

* The JWT carries only the User ID (`sub`) and its expiry. It no longer carries Role codes.
* `AuthMiddleware` verifies the JWT, then reads the `User` and its Roles from MySQL on every request.
  * User not found or `isActive = false`: `401 Unauthorized`. The frontend sends the browser to `/login`.
  * Roles always come from `UserRole` at that moment.
* Deactivating a User or revoking a Role therefore takes effect on the next request.
* Cost: one extra User query and one Role query per request, acceptable at AdAdd's scale.

### 4. `POST /auth/google` checks `isActive`

* An inactive User gets `403 Forbidden`, the same as an unregistered email.
  AdAdd no longer depends on the OAuth test-user list to stop deactivated members.

### 5. Development login is removed

The development login proposed on 2026-10-12 (`POST /auth/dev-login`, `DEV_LOGIN_PASSWORD`,
`DEV_LOGIN_ENABLED`, the form on `/login`) is removed. Mock mode covers checking each Role's
screens, and the MySQL mode uses Google like production. No development-only way into
`apps/api` remains in production code.

### 6. E2E tests create their own session

* Playwright starts `apps/api` with a known `JWT_SECRET` and the header stub off.
* Each test signs a JWT for a seed User with that secret and stores it in the session cookie.
* Every request then takes the production session path (cookie → `/api/proxy` →
  `Authorization: Bearer` → User and Roles read from MySQL). Only Google sign-in itself is not covered.

### 7. Development header stub: removed (option A, decided 2026-10-24)

Neither mode needs the header stub any more. A developer who wants to check a Role's screens
against MySQL signs in with Google as a User registered in AdAdd with that Role (Decision 2);
mock mode covers every Role without MySQL (Decision 1).

* **`apps/web`:** the headers are no longer sent. `getDevAuthHeaders`,
  `NEXT_PUBLIC_DEV_AUTH_ENABLED`, and the bypasses in `proxy.ts` and `roles.ts` are removed.
  `/api/proxy` never forwards `X-User-ID` / `X-User-Roles`.
* **`apps/api`:** the header path in `AuthMiddleware` and `DEV_AUTH_ENABLED` are removed. The headers
  are ignored. Integration tests sign JWTs with a test `JWTIssuer` for Users whose Roles are stored
  in MySQL, as E2E tests do. Only one authentication path remains.
* `JWT_SECRET` is required in every environment, development included. There is no built-in
  fallback secret: the repository is public, so a fallback would let anyone sign a session.

Options considered:

| Option | Description |
| ------ | ----------- |
| **A. Remove (adopted)** | One authentication path. Nothing to switch off in production. |
| B. Keep for automated tests only | Rejected. A flag that opens a bypass can still be left on by mistake, as `docker-compose.yml` did. |
| C. Keep as is | Rejected. Problems 1 and 2 remain possible. |

### 8. Sessions are renewed while in use

Google is used only once per sign-in: its id_token (about one hour) is exchanged for the AdAdd JWT
and then discarded. AdAdd never stores Google tokens.

* The AdAdd JWT is valid for 30 days from issue.
* When a request carries a valid JWT issued more than one day ago, `AuthMiddleware` issues a new one
  and returns it in the `X-Session-Token` response header.
* `/api/proxy` stores it in the session cookie (30 days again) and does not pass the header on to the
  browser. The browser never sees a raw token.
* A member who uses AdAdd at least once every 30 days stays signed in. A session unused for 30 days
  expires, and the next visit goes through Google again.
* Deactivating a User or revoking a Role still takes effect on the next request (Decision 3);
  renewal never extends access for a User who has lost it.

### 9. Re-login skips Google's account chooser

* The Google authorization request no longer forces the account chooser (`prompt=select_account`).
* After a successful sign-in, Next.js stores the signed-in email in an httpOnly cookie
  (`adadd_login_hint`, 180 days) and sends it to Google as `login_hint` on the next sign-in.
  When the browser is still signed in to that Google account, Google returns without asking.
* The hint is kept after logging out, so signing in again is quick. If sign-in fails because the
  email is not registered, the hint is removed so the next attempt shows the chooser.
* `/login` still waits for the user to press the Google button. It never redirects to Google on its
  own, so logging out stays meaningful.

---

## Confirmation Required

Questions for the backend department:

1. **Session checks in `AuthMiddleware`** (Decision 3). Is one User query and one Role query per
   request acceptable? Is `401` for a deactivated User the right response?
2. ~~**Development header stub in `apps/api`.** A, B, or C?~~ Decided: A (2026-10-24).
3. ~~**Default of `DEV_AUTH_ENABLED` in `docker-compose.yml`.**~~ Removed with the stub.

---

## Relation to Issue #152

* With the header stub off, Issue #152 reproduces in development.
* Fix: the Company list and Company edit screens fetch from Client Components through
  `/api/proxy`, like the other screens (option B in the Issue).
  `apiFetch` refuses to run on the server, so no screen can skip the session again.
* An API `401` sends the browser to `/login`, and the proxy drops the rejected session cookie.
* E2E tests run on the session path (Decision 6).
* The Issue's condition "development authentication behavior does not change" is replaced
  by this ADR.

---

## Alternatives Considered

### Development login with a shared password (proposed 2026-10-12, removed)

Let developers sign in to the MySQL mode as any Role without Google. It needed a
development-only endpoint in `apps/api`, guarded by `APP_ENV` and a shared password.
Mock mode now covers checking each Role's screens, and E2E tests sign their own JWTs,
so the endpoint is no longer worth its risk.

### Short JWT lifetime instead of checking MySQL

Old tokens expire sooner, but a deactivated User still keeps access until then.
Reading MySQL on each request removes access immediately. Renewal (Decision 8) is used only so
that active members stay signed in.

### Revoking sessions (server-side session table, or "valid after" time per User)

Would make logout invalidate a stolen token and allow "log out of all devices" or forced logout.
Not adopted (2026-10-14): members use their own devices, and deactivating the User already
removes access on the next request. It would need a migration if adopted later.

### Password sign-in

Would require storing, resetting, and protecting passwords. Google already proves the email address.

### Storing Google refresh tokens

AdAdd does not call Google APIs on the member's behalf, so they are not needed and would only
increase the damage of a leak.

### Redirecting `/login` to Google automatically

Saves one click, but signs the member straight back in after logging out.

---

## Consequences

Specification:

* `spec/api.md`: Authentication and Login (JWT content, per-request checks, `isActive`).
* `spec/frontend.md`: Login (mock mode Role buttons, no development login).
* `spec/development.md`: development modes, environment variables, E2E sign-in.
* `README.md`: authentication notice.

Implementation:

* `apps/api`: JWT without Role codes, per-request User and Role lookup in `AuthMiddleware`,
  session renewal (`X-Session-Token`), `isActive` check in `POST /auth/google`,
  removal of development login, tests.
* `apps/web`: `/api/proxy` stores renewed sessions; the Google sign-in uses `login_hint`
  instead of `prompt=select_account`.
* `apps/web`: `npm run dev:mock`, mock login buttons and mock session, Role gating in mock mode,
  removal of the development login form and route, Advisor added to the mock Users.
* E2E: `playwright.config.ts` and `e2e/support.ts` sign JWTs for seed Users.
* `docker-compose.yml`: `APP_ENV`, `JWT_SECRET`, and `GOOGLE_DRIVE_ROOT_FOLDER_ID` passed to `apps/api`.
* Issue #152 is fixed as described above.
* Decision 7 (Issue #156): the header stub is removed from `apps/api` and `apps/web`, the integration
  tests sign JWTs, `JWT_SECRET` is required everywhere, and `docker-compose.yml` no longer sets
  `DEV_AUTH_ENABLED`.
