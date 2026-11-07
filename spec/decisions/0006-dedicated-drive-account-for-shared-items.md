# ADR-0006: Dedicated Google Account for Ad Material Shared Items

## Status

Accepted — 2026-11-03

Supersedes ADR-0003 where it assumes that the storage location is a Google
shared drive. The committee currently uses a folder shared from My Drive
("shared items"), where each file has an individual owner.

## Context

The dedicated Google Workspace account and its passkey already exist. AdAdd
must upload every new ad-material file as that account so ownership does not
vary with the committee member who clicked Upload. Ordinary AdAdd Users keep
signing in with their own Google accounts and never receive the dedicated
account's password, passkey, access token, or refresh token.

In My Drive only a file owner can reliably move a file to the trash. Therefore
files uploaded previously by individual members cannot automatically be
treated as owned by the dedicated account.

## Decision

### Server-side offline OAuth

An integration administrator authorizes the dedicated account once using the
OAuth web-server flow with offline access. `apps/api` receives a refresh token
and uses it to refresh short-lived access tokens without interactive sign-in.

Secrets are injected into `apps/api` as deployment secrets:

* `GOOGLE_DRIVE_CLIENT_ID`
* `GOOGLE_DRIVE_CLIENT_SECRET`
* `GOOGLE_DRIVE_REFRESH_TOKEN`

They are never stored in MySQL, committed to Git, returned by an API, or sent
to the browser. Local development may use gitignored environment files;
production supplies the same variables from its secret manager. The API must
refuse Drive mutations with a service-unavailable error when the integration
is not configured or its refresh token is rejected.

### Upload

The browser sends file bytes and the selected destination folder ID, but no
Google access token. `apps/api` uploads with the dedicated account and stores
the returned immutable Drive file ID together with URL and display name.

### Deletion

Deleting an AdAdd material performs these steps in order:

1. Check the AdAdd Role and active-Year rule.
2. Resolve the Drive file ID stored on the reference (or, for legacy rows,
   extract it from a recognized Drive URL).
3. As the dedicated account, update the Drive file with `trashed = true`.
4. Only after Drive succeeds, soft-delete the MySQL reference and update the
   Contract Menu's derived submission state.
5. Record the acting AdAdd User in Activity Log.

If Drive returns an error, AdAdd keeps the reference active and returns an
error. A retry is safe: Drive already reporting the file as trashed is treated
as success. Permanent deletion is never performed.

Legacy references whose file is not owned by the dedicated account, or whose
file ID cannot be resolved, remain visible and are not silently removed. They
require ownership transfer or an explicit data-repair decision.

### Authorization and audit

Sponsorship Member, Advisor, Advertisement Manager, and Administrator may
upload and trash material in the active Year. Past Years are read-only for all
Roles. Contract Menu, Sponsorship Menu, and Company deletion remains
Administrator-only.

Drive records the dedicated account as the Google actor. Activity Log records
the real AdAdd User who requested the upload or deletion.

## Consequences

* `ContractMenuDriveFile` gains nullable `driveFileId`; new API uploads always
  populate it.
* The multipart upload endpoint no longer accepts `accessToken`.
* The frontend may still use Google Picker to choose a folder, but its token is
  never sent to `apps/api` and is never used to upload or delete a file.
* Existing shared-item files retain their current owners until separately
  transferred.
* Account recovery and passkey custody are operational responsibilities of the
  current integration administrators; ordinary members never share them.
