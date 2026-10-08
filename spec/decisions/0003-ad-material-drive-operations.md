# ADR-0003: Ad Material Files — Drive Operations by AdAdd

## Status

Accepted — 2026-10-09

---

## Context

Issue #129 allows multiple ad material files per Contract Menu.
PR #139 implements it, including file deletion.

### Business decisions (confirmed 2026-10-09)

* Sponsorship Members handle ad material files freely, including deletion.
* Upload and deletion are allowed for Sponsorship Member, Advisor, and Administrator.
  Finance is not included.
* When a file is deleted in AdAdd, the original in Google Drive should also be removed.
* Ad material files are stored in a Google **shared drive**.
  Only selected people have edit permission on it.

### Problems with the approach in PR #139

PR #139 passes the operator's own Google access token (scope `drive.file`)
from the browser to `apps/api`, which then calls the Drive API as that user.

* `drive.file` only covers files the user created through the app or picked with
  the Picker. A member cannot delete a file uploaded by another member,
  so "any member may delete" cannot work.
* Drive permissions (edit on the shared drive) and AdAdd Roles become two
  separate, inconsistent permission gates.
* `Files.Delete` permanently deletes the file, skipping the trash.
  On a shared drive this requires the Manager role.
* The user's access token travels through `apps/web` and `apps/api`.
* The file body is relayed through the Next.js proxy (`/api/proxy`).
  Hosted platforms limit request body size (about 4.5 MB on Vercel Functions).

---

## Decision

### AdAdd operates Drive with its own identity

`apps/api` performs every ad material Drive operation (upload, trash) with
a dedicated AdAdd identity, not with the operator's token.

* The AdAdd identity is a member of the ad material shared drive with the
  Content manager role (can add, edit, and move files to trash).
* Who may upload or delete is decided only by AdAdd Roles:
  Sponsorship Member, Advisor, and Administrator.
* The browser never sends a Google access token to `apps/api` for Drive operations.

### Deletion moves the file to the trash

* Deleting a file in AdAdd moves the Drive original to the shared drive's trash
  (`trashed = true`). It is not permanently deleted.
  The shared drive trash keeps it for 30 days, so mistakes can be recovered in Drive.
* The Contract Menu File reference is soft-deleted in MySQL (`deleted_at`),
  consistent with other entities.
* Each upload and deletion is recorded in the Activity Log.
* If moving to the trash fails, AdAdd does not remove the reference and returns an error.
  AdAdd never reports success while the Drive original remains.

### Linking a Drive folder

Any folder inside the shared drive can be linked to a Contract Menu (`driveFolderId`),
including folders created directly in Drive without AdAdd.
The browser only sends the folder ID; `apps/api` accesses it with the AdAdd identity.

Files placed in that folder directly in Drive are not shown in AdAdd.
AdAdd lists only the files uploaded through AdAdd (MySQL remains the Single Source of Truth).

### Exception to "Delete is Administrator-only"

`spec/api.md#Authorization Matrix` makes deletion Administrator-only.
Ad material file deletion is an explicit exception, because handling ad material
is the daily work of Sponsorship Members.
Deleting a Contract Menu itself stays Administrator-only.

---

## Confirmation Required

All four items below were confirmed on 2026-10-09:
the AdAdd identity can be added to the shared drive, AdAdd Roles are an acceptable gate,
members have view access to the shared drive, and Advisor may upload as well as delete.
Item 4 (file size and upload path) is settled together with the production deployment.

1. **Can the AdAdd identity join the shared drive?**
   A Google Cloud service account has an address outside the organization's domain.
   If the Workspace administrator blocks external members on shared drives,
   a service account cannot be added.
   Fallback: a dedicated Workspace user account for AdAdd inside the domain,
   whose OAuth refresh token is held by `apps/api`.
2. **Is AdAdd's Role a sufficient gate?**
   Today only selected people can edit the shared drive.
   Under this decision, any Sponsorship Member / Advisor / Administrator can upload
   and trash ad material through AdAdd, even without edit permission on the drive.
   Direct editing in Drive stays limited to the selected people.
3. **Who can view the files?**
   Members open files through Drive links. They need at least view access to the
   shared drive, or AdAdd needs another way to show files.
4. **File size and upload path.**
   Decide the maximum file size and whether the browser uploads directly to Drive
   (resumable upload session issued by `apps/api`) instead of relaying the body
   through `/api/proxy`. This depends on the production deployment (ADR-0002).

---

## Alternatives Considered

### A. Keep the operator's token, move to trash, report failures

Smallest change, but a member can only delete files they uploaded themselves.
It does not meet the business decision that members handle files freely.

### C. AdAdd links only the Drive folder; files are managed in Drive

Simplest, and Drive's own permissions, trash, and history apply.
However, the automatic file naming is lost, and submission status
(`SUBMITTED`) could no longer be derived from AdAdd's own data.
Kept as a fallback if neither identity in item 1 is allowed.

---

## Consequences

* `spec/model.md`: remove "File uploads are append-only". Define soft deletion of Contract Menu Files.
* `spec/api.md`: document `DELETE /contract-menus/{id}/files/{fileId}`, the upload endpoint
  without an access token, and the Authorization Matrix exception.
* `spec/requirements.md` FR-011: reflect that AdAdd uploads to and trashes files in Drive.
* `spec/architecture.md`: document the AdAdd Drive identity and how its credentials are managed.
* PR #139 is reworked to follow this ADR.
