# ADR-0005: Production Database Backup

## Status

Accepted — 2026-10-24

* Method, storage, retention, restore check, and the separation of the production database:
  decided (Issue #169).
* Upload, encryption, and deletion of old dumps (rclone with `crypt`, Decision 6): decided (2026-10-24).
* Some operational details are still open (see Confirmation Required).

This ADR answers "How MySQL is backed up", which ADR-0002 left to a separate ADR.
The rest of the production deployment (where `apps/api` runs, access, network exposure)
is still undecided (ADR-0002, Issue #156).

The procedure is in `spec/operations.md#Backup`.

---

## Context

* The production database will run on a local machine (ADR-0002). If the machine breaks or is lost,
  every Company, contract, payment, and Activity Log is lost with it.
* With Docker Compose, MySQL data lives in the named volume `mysql-data`.
  A single `docker compose down -v` deletes it.
* The development, integration test, and E2E databases (`adadd`, `adadd_test`, `adadd_e2e`)
  share one container (`adadd-mysql`) and that one volume.
  If production were added there, a routine development command could delete real data.
* The data includes real company contact information, so a backup must be protected
  as strictly as the database itself.
* The members who run AdAdd change every year as students graduate.
  A backup kept on one person's PC or personal Google account can disappear with that person.
* Until now `spec/operations.md#Backup` only said "take a manual dump before a risky operation".
  Nothing protected the data between those operations.

---

## Decision

### 1. Method: a daily mysqldump, plus a manual dump before risky operations

* A scheduled job on the production machine runs `mysqldump` of the production database
  once a day (`--single-transaction`, so the API does not have to stop).
* A manual dump is taken right before every risky operation: applying a migration (upgrading),
  a CSV import, restoring a backup into production, and any direct SQL on the production database.
  It does not wait for the daily job.
* A dump (logical backup) is used, not a copy of the volume or the data directory.
  It can be restored into any MySQL 8.4, including a fresh container, and its content can be checked.

### 2. Storage: a restricted folder in the festival's Google Shared Drive

* Every dump (daily and manual) is stored off the machine, encrypted (Decision 6), in a folder of the festival's
  Google Shared Drive (共有ドライブ).
* Only a limited set of members can access that folder. Being a member of a Shared Drive
  (e.g. the ad material shared drive, ADR-0003) must not by itself give access to the backups.
* A Shared Drive belongs to the organization, not to a person, so the backups survive
  a member's graduation. Access is handed over together with the Administrator role
  (`spec/operations.md#Handing over`).
* A copy may stay on the production machine for a short time (e.g. for a quick restore),
  but it never counts as the backup.

### 3. Retention

| Dump | Kept |
| ---- | ---- |
| Daily | 30 days |
| The first daily dump of each month | Until the end of that festival Year |
| Manual (before a risky operation) | At least until the operation is confirmed to have worked |

Older dumps are deleted. A dump holds real contact data, so it is not kept longer than needed.
The daily job deletes old daily and monthly dumps itself (Decision 6). Manual dumps are deleted by hand.

### 4. Restore check

A backup that has never been restored is not trusted. A dump is restored into a separate,
temporary MySQL container (never the production one) and checked:

* once per semester (学期ごと), and
* before every production migration (the rehearsal in the upgrade procedure uses the manual dump).

The temporary container is removed after the check, because it holds real data.

### 5. The production database is separated from development

* Production MySQL runs in its own container with its own named volume,
  defined in a separate Docker Compose project (its own compose file and project name).
* Development, integration test, and E2E databases stay in the development `adadd-mysql`
  container. `docker compose down -v` in the development project cannot touch the production volume.
* The production compose file and its other settings (`APP_ENV`, `JWT_SECRET`, network exposure)
  are part of Issue #156 and are not designed here.

### 6. Upload and encryption: rclone with a `crypt` remote

* The daily job uploads with [rclone](https://rclone.org/). Two remotes are configured on the production machine:

| Remote | Type | Points to |
| ------ | ---- | --------- |
| `adadd-backup-drive` | `drive` | The restricted backup folder in the Shared Drive |
| `adadd-backup` | `crypt` | `adadd-backup-drive:` — encrypts on the way in, decrypts on the way out |

* Dumps are always written through `adadd-backup`, never directly to `adadd-backup-drive`.
  File contents and names are encrypted before they leave the machine, so the Shared Drive
  (and anyone with access to it) only ever holds encrypted files.
* The same job, after uploading, deletes old dumps according to the retention rule (Decision 3):
  daily dumps older than 30 days, and the monthly dumps of a festival Year that has ended.
* Restoring goes the same way back: `rclone copy` from `adadd-backup` decrypts the file,
  then the usual restore steps follow.

### 7. The encryption key is kept by the Administrator, outside the machine and the repository

* The `crypt` password and salt are kept separately by the Administrator.
  They are never committed to the repository, and never kept only on the production machine.
* Without them, every backup is unreadable. If the production machine is lost, a new machine
  can read the backups only with the password and salt kept elsewhere.
* They are handed over together with the Administrator role and access to the backup folder.

---

## Reasons

### The local machine is a single point of failure

A dump kept on the same machine is lost together with the database. Only an off-machine copy
protects against a broken disk, a lost PC, or a mistaken `down -v`.

### The Shared Drive is already part of the festival's operation

The festival already uses Google Shared Drives (ADR-0003). They belong to the organization,
outlive individual members, and their membership can be limited. No new service or account is needed.

### Daily is enough for AdAdd's scale

AdAdd is used by a small committee, and the amount of input per day is small.
A daily dump limits the loss to at most one day of input, and the manual dump before
risky operations covers the moments with the highest risk.

### Retention follows the festival Year

Thirty days of daily dumps cover mistakes noticed late. One dump per month until the end of the Year
allows going back to an earlier state of the same Year (e.g. a deletion noticed months later)
without keeping every day.

### Encrypting before upload limits who can read the data

Shared Drive access can be granted by mistake or kept after someone leaves. With `crypt`,
reading a backup needs both access to the folder and the key kept by the Administrator.
rclone also deletes old files on the remote in the same job, so retention needs no manual work.

### Separation makes the dangerous command harmless

`docker compose down -v` is a normal command when resetting a development database.
With production in a different compose project and volume, running it in development is always safe.

---

## Alternatives Considered

### Copying the Docker volume or the data directory

Fast, but the MySQL server must be stopped for a consistent copy, the copy is tied to the MySQL version
and file layout, and its content cannot be checked without starting a server. Not adopted.

### Binary logs for point-in-time recovery

Would reduce the loss to minutes, but needs binary log management and a more difficult restore.
Not needed at AdAdd's scale. Can be added later if one day of loss becomes unacceptable.

### A personal Google Drive or an external disk

A personal account disappears or loses access when its owner graduates. An external disk next to
the machine is lost in the same accident and is easily taken. Not adopted.

### Google Drive for desktop syncing a local folder

No extra tool, but files arrive in Drive unencrypted, and deleting old dumps would need
a separate step. Not adopted.

### Keeping production in the development container

Only one MySQL to run, but development commands (`down -v`, dropping and recreating databases for tests)
would endanger real data. Not adopted.

---

## Confirmation Required

Not decided by this ADR:

1. **Operating system of the production machine and the scheduler.** The spec does not record the OS.
   The daily job uses the OS scheduler (cron on Linux/macOS, Task Scheduler on Windows).
   Also: the time of day, and what happens when the machine is off at that time
   (run at next start, or skip).
2. **Who exactly can access the backup folder, and how it is restricted.** "A limited set of members" —
   e.g. the Administrators only, or Administrators and the Advisor. Whether it is a Shared Drive of its own
   or a folder with limited access inside an existing one. Also which Google account
   the `adadd-backup-drive` remote signs in with.
3. **Where the `crypt` password and salt are stored** (Decision 7), so that they survive
   the Administrator's graduation and are not lost with the production machine.
4. **Failure notification.** How a failed daily job (dump or upload) is noticed, e.g. a Slack message
   or a regular check of the folder.
5. **Who runs the semester restore check, and where the result is recorded.**

Decided on 2026-10-24 and removed from this list: how dumps reach the Shared Drive (rclone),
encryption (`crypt`), and how old dumps are deleted (by the same job) — Decisions 6 and 7.

---

## Consequences

Specification:

* `spec/operations.md#Backup`: the procedure (daily job, manual dump, storage, retention,
  restore, restore check) replaces "Undecided".
* `spec/architecture.md` Deployment: production MySQL runs in its own compose project and is backed up
  as decided here.

Operation and implementation:

* The production compose file (separate project, container, and volume) is created with Issue #156.
* The daily backup job (dump, upload through `adadd-backup`, deletion of old dumps) is implemented
  once item 1 above is decided.
* rclone is installed on the production machine, and the two remotes are configured (Decision 6).
* The restricted folder is created in the Shared Drive, and its members are set (item 2).
* The Administrator stores the `crypt` password and salt (item 3).
