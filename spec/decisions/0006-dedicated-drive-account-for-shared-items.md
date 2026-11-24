# ADR-0006: Dedicated Google Account for Ad Material Shared Items

## Status

Accepted — 2026-11-03, revised 2026-11-24

Supersedes ADR-0003 where it assumes that the storage location is a Google
shared drive. The committee currently uses a folder shared from My Drive
("shared items"), where each file has an individual owner.

### Revision history

* 2026-11-03: Initial version. Dedicated user account with offline OAuth (refresh token).
* 2026-11-24: Switch from dedicated user account + OAuth refresh token to a **Google Cloud service account** with a JSON key. The GCP project is a personal project and cannot use "Internal" mode, so the "External — Testing" refresh token expires every 7 days (ADR-0007). A service account uses JWT-based authentication and is not subject to this limitation.

## Context

The dedicated Google Workspace account and its passkey already exist. AdAdd
must upload every new ad-material file as that account so ownership does not
vary with the committee member who clicked Upload. Ordinary AdAdd Users keep
signing in with their own Google accounts and never receive the dedicated
account's password, passkey, access token, or refresh token.

In My Drive only a file owner can reliably move a file to the trash. Therefore
files uploaded previously by individual members cannot automatically be
treated as owned by the dedicated account.

### Refresh token expiry under "External — Testing" mode

The GCP project used for Drive is a personal project and cannot be set to
"Internal" mode (which requires a Google Workspace organization). Under
"External — Testing" mode, OAuth refresh tokens expire after 7 days. This
required re-running `cmd/drive-auth` weekly — an unacceptable operational
burden for a student organization.

A Google Cloud service account authenticates via a JSON key file using JWT,
not OAuth tokens. It is not subject to the 7-day refresh token limitation.

## Decision

### ~~Server-side offline OAuth~~ → Service account with JSON key

~~An integration administrator authorizes the dedicated account once using the
OAuth web-server flow with offline access. `apps/api` receives a refresh token
and uses it to refresh short-lived access tokens without interactive sign-in.~~

A Google Cloud service account is created in the Drive GCP project. The
service account authenticates using a JSON key file, which `apps/api` reads
at startup. No interactive authorization flow is needed, and the credentials
do not expire.

Secrets are injected into `apps/api` as deployment secrets:

* ~~`GOOGLE_DRIVE_CLIENT_ID`~~
* ~~`GOOGLE_DRIVE_CLIENT_SECRET`~~
* ~~`GOOGLE_DRIVE_REFRESH_TOKEN`~~
* `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY` — the service account JSON key content

They are never stored in MySQL, committed to Git, returned by an API, or sent
to the browser. Local development may use gitignored environment files;
production supplies the same variable from its secret manager. The API must
refuse Drive mutations with a service-unavailable error when the integration
is not configured or the service account key is invalid.

`cmd/drive-auth` is deleted. Service accounts do not require an interactive
OAuth authorization flow.

### Drive folder sharing

The root folder in My Drive must be shared with the service account's email
address (`<name>@<project-id>.iam.gserviceaccount.com`) as an **Editor**. All
subfolders inherit this permission. This replaces the need for the dedicated
user account to own the folder hierarchy.

### Upload

The browser sends file bytes and the selected destination folder ID, but no
Google access token. `apps/api` uploads with the service account and stores
the returned immutable Drive file ID together with URL and display name.

### Deletion

Deleting an AdAdd material performs these steps in order:

1. Check the AdAdd Role and active-Year rule.
2. Resolve the Drive file ID stored on the reference (or, for legacy rows,
   extract it from a recognized Drive URL).
3. As the service account, update the Drive file with `trashed = true`.
4. Only after Drive succeeds, soft-delete the MySQL reference and update the
   Contract Menu's derived submission state.
5. Record the acting AdAdd User in Activity Log.

If Drive returns an error, AdAdd keeps the reference active and returns an
error. A retry is safe: Drive already reporting the file as trashed is treated
as success. Permanent deletion is never performed.

Legacy references whose file is not owned by the service account (or the
former dedicated user account), or whose file ID cannot be resolved, remain
visible and are not silently removed. They require ownership transfer or an
explicit data-repair decision.

### Authorization and audit

Sponsorship Member, Advisor, Advertisement Manager, and Administrator may
upload and trash material in the active Year. Past Years are read-only for all
Roles. Contract Menu, Sponsorship Menu, and Company deletion remains
Administrator-only.

Drive records the service account as the Google actor. Activity Log records
the real AdAdd User who requested the upload or deletion.

### File ownership

* New files uploaded after migration are owned by the service account.
* Existing files remain owned by the dedicated user account.
* Both are accessible to anyone who has access to the shared folder.
* Trash operations on files not owned by the service account may fail. These
  legacy files require ownership transfer or manual handling (same as before).

## Migration

### Prerequisites

1. This ADR revision is approved.
2. The service account is created in the Drive GCP project and the JSON key
   is downloaded.
3. The root folder in My Drive is shared with the service account as Editor.

### Code changes

1. Replace `DriveService.driveClient()` in `apps/api/internal/service/drive_service.go`:
   use `google.CredentialsFromJSON` with the service account key instead of
   `oauth2.Config` with a refresh token.
2. Update `apps/api/internal/config/config.go`: replace the three OAuth
   environment variables with `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY`. Update
   the all-or-nothing validation.
3. Delete `apps/api/cmd/drive-auth/` (the interactive OAuth CLI tool).
4. Update `.env.example` and `.env.production.example`.

### Environment variable changes

| Variable | Action |
|----------|--------|
| `GOOGLE_DRIVE_CLIENT_ID` | **Remove** |
| `GOOGLE_DRIVE_CLIENT_SECRET` | **Remove** |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | **Remove** |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY` | **Add** (JSON key content) |
| `GOOGLE_DRIVE_ACCOUNT_EMAIL` | Becomes the service account email |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | No change |

### Verification

- [ ] Folder listing (`GET /drive/folders`) works
- [ ] File upload works and files appear in the correct folder
- [ ] Trash operation works on files owned by the service account
- [ ] Drive-not-configured state (empty key) returns 503
- [ ] Invalid key returns startup error or service-unavailable

### Rollback

Revert the code changes, restore the three OAuth environment variables, and
re-run `cmd/drive-auth` to obtain a fresh refresh token.

## Consequences

* `ContractMenuDriveFile` gains nullable `driveFileId`; new API uploads always
  populate it.
* The multipart upload endpoint no longer accepts `accessToken`.
* `cmd/drive-auth` is deleted; no periodic re-authorization is needed.
* Existing shared-item files retain their current owners until separately
  transferred.
* Service account key custody is an operational responsibility of the
  integration administrators; ordinary members never access it.
* The 7-day refresh token expiry documented in ADR-0007 no longer applies
  to Drive operations.

## References

* Issue #238 (service account migration)
* ADR-0003 (noted risk: shared drive may block external service accounts)
* ADR-0007 (GCP project separation; 7-day limitation)
