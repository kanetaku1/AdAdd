# API Design

## Purpose

This document defines the API interface of AdAdd.

The API provides access to sponsorship management functions based on the domain model.

The API layer must follow these principles:

* MySQL is the single source of truth.
* External services such as Google Forms, Google Sheets, Gmail, and Google Drive are integration targets, not primary data stores.
* API design follows business use cases rather than database tables.
* Authorization rules are applied based on user roles and responsibilities.

---

# API Conventions

## Base URL

Development:

```
http://localhost:8080/api/v1
```

Production:

```
https://{domain}/api/v1
```

---

# Authentication

## Overview

All APIs except authentication endpoints require user authentication.

Authentication information is provided through:

```
Authorization: Bearer {token}
```

`{token}` is an AdAdd-issued JWT, not a Google token — see Login below.

On every request, the server verifies the token, then reads the `User` it names and that User's Roles from MySQL (`spec/decisions/0004-development-modes-and-sessions.md`):

* The User no longer exists, or `isActive = false`: `401 Unauthorized`, `error.code = "UNAUTHORIZED"`.
* Role checks use the User's `UserRole` grants at that moment, so deactivating a User or revoking a Role takes effect on the next request.
* Session renewal: when the token was issued more than one day ago, the response carries a new token in the `X-Session-Token` header. The caller replaces its stored token with it. The frontend's BFF proxy does this and never passes the header on to the browser (`spec/frontend.md#Login`). A token that is not renewed expires 30 days after it was issued.

In development only, `X-User-ID` / `X-User-Roles` headers may be sent instead when the server has `DEV_AUTH_ENABLED=true`; this path must be disabled in production and on any shared server. Its future is decided in `spec/decisions/0004-development-modes-and-sessions.md`.

## Login

```
POST /auth/google
```

Exchanges a Google-issued `id_token` (obtained by the frontend via the standard OAuth Authorization Code flow with Google — see `spec/frontend.md#Login`) for an AdAdd session.

Request:

```json
{
  "idToken": "..."
}
```

The server verifies the token's signature against Google's public keys, then looks up a `User` by the token's `email` claim (exact match, case-insensitive). There is no Google Workspace / hosted-domain restriction — AdAdd committee members sign in with ordinary personal `@gmail.com` accounts, so the only gate is whether that exact email was pre-registered by an Administrator (`spec/model.md` → Business Invariants).

Response (email found):

```json
{
  "data": {
    "token": "...",
    "user": {
      "id": "user_id",
      "name": "山田太郎",
      "roles": ["SPONSORSHIP_MEMBER"]
    }
  },
  "message": "success"
}
```

`token` is a signed JWT containing only the User's ID (`sub`), its issue time, and its expiry (30 days; renewed while in use, see Overview above). It carries no Role codes; Roles are read from MySQL on every request (see Overview above). `user.roles` in the response is the User's Roles at sign-in, for the frontend's convenience. Every subsequent request must send this token as `Authorization: Bearer {token}`.

If the email has no matching `User`: `403 Forbidden`, `error.code = "FORBIDDEN"`, message indicating the email is not registered — the frontend must not create a session.

If the User has `isActive = false`: `403 Forbidden`, `error.code = "FORBIDDEN"`, handled by the frontend the same way. AdAdd does not rely on the OAuth client's test-user list to stop deactivated members.

---

# Common Response Format

## Success

```json
{
  "data": {},
  "message": "success"
}
```

## Error

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Company not found"
  }
}
```

The fixed set of `error.code` values is `INVALID_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR` (`apps/api/internal/handler/error.go`).

---

# User Management API

## Get Current User

Returns the authenticated user's information.

```
GET /users/me
```

Response:

```json
{
  "id": "user_id",
  "name": "山田太郎",
  "roles": [
    "SPONSORSHIP_MEMBER"
  ]
}
```

`roles` is the User's current `UserRole` grants, by Role `code` (`spec/model.md#Role`) — never a client-supplied value.

---

## List Users

Returns every system user (see `spec/usecase.md` UC-12).

```
GET /users
```

Permission:

* Admin

---

## Create User

Registers a new system user.

```
POST /users
```

Request:

```json
{
  "studentId": "b1234567",
  "name": "田中",
  "email": "tanaka@example.com",
  "slackId": null
}
```

Permission:

* Admin

---

## Bulk Import Users

Creates many Users from a CSV in one request (Year-turnover pre-registration, `spec/frontend.md#CSV Import / Export`). Existing one-by-one `POST /users` stays for mid-cycle additions.

```
POST /users/bulk
```

`multipart/form-data` with file field `file`. Form field `dryRun=true` validates and returns the preview without writing. Omit or `false` to create the valid rows.

CSV is UTF-8 (BOM allowed). Header row required. Columns (names are exact):

| Header    | Required | Notes |
| --------- | -------- | ----- |
| studentId |          | |
| name      | yes      | |
| email     | yes      | unique vs existing Users and within the file |
| slackId   |          | |
| roles     |          | comma-separated Role `code`s (`spec/model.md#Role`); empty = no Role |

Each row is independent. Invalid / duplicate rows are returned in `errors` and skipped; valid rows are created (`isActive` true). Unknown Role codes fail that row.

Response:

```json
{
  "totalCount": 100,
  "successCount": 97,
  "errorCount": 3,
  "successfulRows": [],
  "errors": [
    { "rowNumber": 12, "message": "すでに登録されているメールアドレスです" }
  ]
}
```

`rowNumber` is 1-based including the header (first data row is 2). HTTP 400 if the file is missing, not CSV, or has no data rows.

Permission:

* Admin

---

## Update User

Edits a user's profile, or activates/deactivates them.

```
PATCH /users/{userId}
```

Example (deactivation):

```json
{
  "isActive": false
}
```

Role assignment is a separate call — see Grant Role / Revoke Role below (`spec/usecase.md` UC-12).

Permission:

* Admin

---

## List Roles

Returns the fixed set of 5 Roles (`spec/model.md#Role`) — master data, not user-creatable.

```
GET /roles
```

Permission:

* Admin

---

## Grant Role

Grants a Role to a User (creates a `UserRole`).

```
POST /users/{userId}/roles
```

Request:

```json
{
  "roleId": "role_id"
}
```

Returns `409 Conflict` if the User already holds that Role (`userId` + `roleId` must be unique, `spec/model.md#UserRole`).

Permission:

* Admin

---

## Revoke Role

Removes a Role from a User (deletes the `UserRole`).

```
DELETE /users/{userId}/roles/{roleId}
```

Permission:

* Admin

---

# Festival Year API

## List Years

Returns every festival Year.

```
GET /years
```

Each Year includes its document issuer information (`spec/model.md#Year`): `issuerName`, `issuerPostalCode`, `issuerAddressLine1`, `issuerAddressLine2`, `issuerEmail`, `bankName`, `bankBranchName`, `bankAccountType`, `bankAccountNumber`, `bankAccountHolderName`. The frontend reads these when it generates an invoice or receipt (FR-015). The seal image is not Year data and has no API; it stays a static file in the repository (`apps/web/public/images/43rd_Stamp.png`, Issue #176).

---

## Past Years Are Read-Only

Only the active Year accepts changes. A past Year accepts exactly one kind of change: `PATCH /payments/{paymentId}` (payment confirmation, both `CONFIRMED` and back to `WAITING`, together with `receivedAmount` and `remarks`) — see `spec/domain.md#Active Year and Past Years`.

Every other write to a record that belongs to a past Year is rejected with HTTP 409 `CONFLICT` and the message 過去の年度は閲覧のみです（入金確認を除く）. The Year of a record is resolved through its owner:

| Endpoint | Year comes from |
| -------- | --------------- |
| `PATCH /years/{yearId}` | the Year itself |
| `POST /years/{yearId}/companies`, `POST /years/{yearId}/sponsorship-menus`, `POST /years/{yearId}/sponsorship-menus/copy-from-previous-year`, `PATCH /years/{yearId}/document-issuer` | `yearId` |
| `PATCH /yearly-companies/{id}/…` (company-status, phase, progress, company-contact), `POST /yearly-companies/{id}/assignments`, `POST /yearly-companies/{id}/contract` | the Yearly Company |
| `PATCH /contracts/{contractId}`, `POST /contracts/{contractId}/menus`, `POST /contracts/{contractId}/payment` | the Contract's Yearly Company |
| `PATCH` / `DELETE /contract-menus/{id}` and its `status`, `production-department`, `production`, `drive-upload` | the Contract Menu's Contract |
| `PATCH` / `DELETE /sponsorship-menus/{menuId}` | the Sponsorship Menu |
| `POST /advisor-assignments`, `DELETE /advisor-assignments/{id}` | `yearId` of the Advisor Assignment |

The check is enforced in the backend, regardless of Role (Administrator included). Reads (`GET`) are not restricted. Year-independent data — Companies, Users, Roles — is not affected.

Confirming a past Year's Payment, or moving it back to `WAITING`, also changes that Yearly Company's `progress` (see Update Payment Status). That change is part of the allowed payment confirmation, not a separate write, so it is not rejected.

---

## Create Year

Creates a new festival Year and makes it the active Year (`isActive`). All other Years are deactivated.

```
POST /years
```

Request:

```json
{
  "name": "2027",
  "startDate": "2027-04-01",
  "endDate": "2027-11-30"
}
```

Side effect: bulk-generates a `YearlyCompany` for every existing `Company` (see `spec/usecase.md` UC-01, `spec/domain.md#Yearly Company`). For each Company, `companyStatus` is computed automatically (Continuing/New — never Dormant, see `spec/model.md#Value Objects` → `CompanyStatus`), `phase` defaults to `PHASE_3`, `progress` defaults to `NOT_CONTACTED`, and contact fields (`postalCode`, `address`, `phoneNumber`, `website`, `contactPersonName`, `contactEmailOrForm`, `memo`) are copied from that Company.

`startDate` and `endDate` are plain `YYYY-MM-DD` dates, the same format as the response.

Permission:

* Administrator

Side effect: the new Year's document issuer information (`issuer*`, `bank*`) is copied from the previous Year (`spec/model.md#Year`). The Administrator then edits it with Update Document Issuer Information below.

---

## Update Document Issuer Information

Updates the issuer information and bank transfer account printed on the Year's invoices and receipts (FR-015, Issue #170). Replaces the constants that used to be hard-coded in `apps/web/src/lib/pdf/constants.ts`, so a change does not need a redeploy.

```
PATCH /years/{yearId}/document-issuer
```

Request (every field optional; omitted fields are unchanged):

```json
{
  "issuerName": "長岡技術科学大学 技大祭実行委員会",
  "issuerPostalCode": "〒940-2188",
  "issuerAddressLine1": "新潟県長岡市上富岡町1603-1",
  "issuerAddressLine2": "長岡技術科学大学内",
  "issuerEmail": "sponsorship-group@example.com",
  "bankName": "○○銀行（金融機関コード : 0000）",
  "bankBranchName": "○○支店（支店コード : 000）",
  "bankAccountType": "普通預金",
  "bankAccountNumber": "0000000",
  "bankAccountHolderName": "技大祭実行委員会(ギダイサイジツコウイインカイ)"
}
```

Values are plain text and are printed as entered. Returns the updated Year.

A past Year is rejected like any other past-Year write (Past Years Are Read-Only above).

Permission:

* Administrator

---

## Update Year

Corrects a Year's name or period, e.g. after it was created with a typo (`spec/domain.md#Correcting a Year`).

```
PATCH /years/{yearId}
```

Request (all fields optional):

```json
{
  "name": "2027",
  "startDate": "2027-04-01",
  "endDate": "2027-11-30"
}
```

`name`, `startDate`, and `endDate` use the same format as Create Year. `isActive` is not accepted; it changes only through Create Year. Nothing the Year owns is changed.

A past Year is rejected with `409 CONFLICT` (see Past Years Are Read-Only). Whether a past Year's name should become correctable is not decided (Issue #172). An unknown `yearId` returns `404`.

Permission:

* Administrator

---

## No Year Deletion

There is no `DELETE /years/{yearId}`. A Year is never deleted, by any Role (`spec/domain.md#Year`). It owns that cycle's Yearly Companies, Sponsorship Menus, Contracts, and Payments, and the next Year's `companyStatus` is computed from it. A mistakenly created Year is corrected with Update Year instead.

---

# Company API

## List Companies

Returns company master data.

```
GET /companies
```

Query:

| Parameter | Description          |
| --------- | -------------------- |
| keyword   | Company name search  |

Company status and sponsorship phase are per-Year attributes of `YearlyCompany`, not `Company` — filter by them via `GET /years/{yearId}/companies` instead.

Example response item:

```json
{
  "id": "company_id",
  "companyName": "株式会社長岡テクノ",
  "companyNameKana": "ナガオカテクノ",
  "postalCode": "940-2188",
  "address": "新潟県長岡市上富岡町1603-1",
  "phoneNumber": "0258-00-0000",
  "website": "https://example.com",
  "contactPersonName": "山田太郎",
  "contactEmailOrForm": "yamada@example.com",
  "firstSponsorshipYear": "2015",
  "memo": ""
}
```

---

## Get Company

Returns a single Company (used by Company Form edit — `spec/frontend.md#Company Management`).

```
GET /companies/{id}
```

Same item shape as List Companies.

---

## Create Company

Creates new company master data.

```
POST /companies
```

Permission:

* Sponsorship Member / Administrator

---

## Bulk Import Companies

Creates many Companies from a CSV in one request (`spec/frontend.md#CSV Import / Export`). When a Year is active, each created Company is also registered into that Year as a Yearly Company, in the same operation. Existing one-by-one `POST /companies` stays for individual registration.

```
POST /companies/bulk
```

`multipart/form-data` with file field `file`. Form field `dryRun=true` validates and returns the preview without writing. Omit or `false` to create the valid rows.

CSV is UTF-8 (BOM allowed). Header row required. Columns (names are exact):

| Header               | Required | Notes |
| -------------------- | -------- | ----- |
| companyName          | yes      | unique vs existing Companies and within the file |
| companyNameKana      |          | |
| postalCode           |          | |
| address              |          | |
| phoneNumber          |          | |
| website              |          | |
| contactPersonName    |          | |
| contactEmailOrForm   |          | |
| firstSponsorshipYear |          | |
| memo                 |          | |
| previousYearContract |          | `あり` / `なし` / empty (= `なし`). Whether the company had a sponsorship contract in the Year before the active one. Any other value is an error row. |

Each row is independent. Invalid / duplicate rows are returned in `errors` and skipped; valid rows are created. Same response shape as Bulk Import Users (`totalCount` / `successCount` / `errorCount` / `successfulRows` / `errors`). HTTP 400 if the file is missing, not CSV, or has no data rows.

Duplicate `companyName` is an exact match: the database collation distinguishes every character difference, including dakuten, kana type, full/half width, and letter case (`spec/database.md#Character Set and Collation`). Normalize names before importing.

Yearly Company registration (when a Year is active):

* Every created Company gets a Yearly Company in the active Year. `phase` = `PHASE_3`, `progress` = `NOT_CONTACTED`, contact fields copied from the Company — the same defaults as Create Year.
* `companyStatus` is derived from `previousYearContract`: `あり` → `CONTINUING`, otherwise `NEW`. This is the input for history from before AdAdd (`spec/domain.md#Company Status`). The status itself is not accepted.
* Each item in `successfulRows` is the Company plus `companyStatus`, the status it will get (preview) or got (confirm) in the active Year.

When no Year is active, Companies are created without Yearly Companies, and `companyStatus` is omitted. A row with `previousYearContract` = `あり` is then an error row, so the fact is not lost: create the Year first (`spec/operations.md#Initial Data Migration`).

Confirm (`dryRun=false`) writes all valid rows in one transaction. If any write fails, nothing is created and the API returns an error. A success response means every row in `successfulRows` was created.

Permission:

* Sponsorship Member / Administrator

---

## Update Company

Updates company master data.

```
PATCH /companies/{companyId}
```

Updates the Company master only. Existing Yearly Company contact snapshots are not rewritten (`spec/model.md#YearlyCompany`).

---

## Delete Company

Removes a Company from the master data.

```
DELETE /companies/{id}
```

Deletion is for removing a mistaken or duplicate registration. A Company that has a Yearly Company in any Year is rejected with `409 Conflict` — its sponsorship history (Yearly Companies, Contracts, Payments, Activity Logs) must not be lost (`spec/business.md` "History should never be deleted"). An unknown `id` returns `404`.

Permission:

* Administrator only — see Authorization Matrix (deletion is Administrator-only system-wide). Sponsorship Member's "Manage company master data" access is create/update only.

---

# Yearly Company API

## List Yearly Companies

Returns companies participating in a specific year.

```
GET /years/{yearId}/companies
```

Query:

| Parameter      | Description |
| -------------- | ----------- |
| keyword        | Company-name search (typo-tolerant / similar-term; not limited to exact substring) |
| companyStatus  | Company relationship history |
| phase          | Sponsorship outreach priority (this Year) |
| assigneeUserId | Sponsorship member |
| advisorUserId  | Advisor (match Yearly Companies whose assignee is supervised by this advisor in the same Year) |
| progress       | Sponsorship progress |
| hasContract    | Contract existence filter (`true` / `false`) |

The response joins `Company.companyName` / `companyNameKana` and the assigned member (`CompanyAssignment`, see Company Assignment API below) so each item is self-contained for list display. Contact fields on the item are this Year's Yearly Company snapshot, not a live join of the Company master:

```json
{
  "id": "yearly_company_id",
  "yearId": "year_id",
  "companyId": "company_id",
  "companyName": "株式会社長岡テクノ",
  "companyNameKana": "ナガオカテクノ",
  "companyStatus": "CONTINUING",
  "phase": "PHASE_1",
  "progress": "INVOICE_SENT",
  "assignedMemberId": "user_id",
  "assignedMemberName": "田中",
  "contractTotalAmount": 95000,
  "postalCode": "940-2188",
  "address": "新潟県長岡市上富岡町1603-1",
  "phoneNumber": "0258-00-0000",
  "website": "https://example.com",
  "contactPersonName": "山田太郎",
  "contactEmailOrForm": "yamada@example.com",
  "memo": "継続協賛企業",
  "notes": ""
}
```

`assignedMemberId`/`assignedMemberName` surface the Yearly Company's `CompanyAssignment`, which is domain-modeled as 0..1 (`spec/model.md#CompanyAssignment`) — there is at most one assignee, never a list.

`contractTotalAmount` is joined from the Yearly Company's `SponsorshipContract` (0..1, 1:1 per `spec/model.md`) — `null` when no contract exists yet. Included so Dashboard-style aggregate views (spec/frontend.md#Dashboard) can sum contract amounts across a Year from this single list call, without an additional per-company round trip.

`advisorUserId` filtering is derived via `AdvisorAssignment` for the same `yearId`; Advisor names are not stored on YearlyCompany itself (see `spec/requirements.md` FR-003 / FR-013).

---

## Create Yearly Company

Creates a yearly company record (the individual, mid-cycle registration path — see `spec/usecase.md` UC-01 Notes; bulk generation happens automatically via `POST /years`).

```
POST /years/{yearId}/companies
```

Request:

```json
{
  "companyId": "company_id"
}
```

`companyStatus` is computed server-side (Continuing/New, based on whether the Company had a Yearly Company with a Sponsorship Contract in the immediately preceding Year — see `spec/model.md#Value Objects` → `CompanyStatus`) and must not be accepted from the request body. `phase` defaults to `PHASE_3`; `progress` defaults to `NOT_CONTACTED`. Contact snapshot fields are copied from the Company at creation.

---

## Get Yearly Company

```
GET /yearly-companies/{id}
```

Same item shape as List Yearly Companies (including the contact snapshot and joined `companyName` / `companyNameKana`).

---

## Get Yearly Company

Returns a single Yearly Company (used by Yearly Company Detail — `spec/frontend.md#Yearly Company Detail`).

```
GET /yearly-companies/{id}
```

Same item shape as List Yearly Companies.

---

## Update Company Status

Updates the company's relationship history classification.

```
PATCH /yearly-companies/{yearlyCompanyId}/company-status
```

Example:

```json
{
  "companyStatus": "CONTINUING"
}
```

---

## Update Sponsorship Phase

Updates the outreach priority ranking for the current Year (see UC-02).

```
PATCH /yearly-companies/{yearlyCompanyId}/phase
```

Example:

```json
{
  "phase": "PHASE_1"
}
```

---

## Update Yearly Company Contact

Updates this Year's contact snapshot and overwrites the same fields on the Company master. Other Yearly Companies for that Company are not updated (`spec/model.md#YearlyCompany`).

Writes a `COMPANY_CONTACT_UPDATED` Activity Log when at least one field actually changes.

```
PATCH /yearly-companies/{yearlyCompanyId}/company-contact
```

Request:

```json
{
  "postalCode": "940-2188",
  "address": "新潟県長岡市上富岡町1603-1",
  "phoneNumber": "0258-00-0000",
  "website": "https://example.com",
  "contactPersonName": "山田太郎",
  "contactEmailOrForm": "yamada@example.com",
  "memo": "継続協賛企業"
}
```

Permission:

* Sponsorship Member / Administrator

---

# Company Assignment API

## Assign Sponsorship Member

Assigns a sponsorship member to a company.

```
POST /yearly-companies/{id}/assignments
```

Request:

```json
{
  "userId": "user_id"
}
```

The body is `userId` only (`null` to clear). `CompanyAssignment` does not store a Role — the assignee's permissions come from `UserRole` (`spec/model.md#Role`).

`CompanyAssignment` is domain-modeled as 0..1 per Yearly Company (`spec/model.md#CompanyAssignment`), so this endpoint always replaces any existing `CompanyAssignment` for the Yearly Company rather than adding a second row — sending `userId: null` clears the assignment.

Permission:

* Administrator

---

# Advisor Assignment API

## Assign Advisor

Adds an advisor to a sponsorship member for a given Year. A Sponsorship Member may have multiple Advisors within the same Year (no upper bound — `spec/model.md` constraint: Year + memberId + advisorId must be unique). This always creates a new `AdvisorAssignment` row; it never replaces an existing one. Assigning the same Advisor to the same Member in the same Year twice returns `409 Conflict` (see `spec/usecase.md` UC-03).

```
POST /advisor-assignments
```

Request:

```json
{
  "yearId": "year_id",
  "advisorUserId": "advisor_id",
  "memberUserId": "member_id"
}
```

Permission:

* Administrator

---

## Remove Advisor

Removes a single advisor assignment.

```
DELETE /advisor-assignments/{id}
```

Permission:

* Administrator

---

## List Advisor Assignments

Returns every AdvisorAssignment for a Year (used to build the member↔advisor table — see `spec/frontend.md#Advisor Assignment`). A single member may appear multiple times, once per Advisor.

```
GET /advisor-assignments?yearId={yearId}
```

---

# Sponsorship Contract API

## Get Contract

Returns sponsorship contract information. A Yearly Company has at most one contract.

```
GET /yearly-companies/{id}/contract
```

Example response:

```json
{
  "id": "contract_id",
  "yearlyCompanyId": "yearly_company_id",
  "contractDate": "2026-06-01",
  "totalAmount": 100000,
  "remarks": ""
}
```

The contract has no assignee field. The assignee is the Yearly Company's current assignment — `assignedMemberId` / `assignedMemberName` on Get Yearly Company (`spec/domain.md#Sponsorship Contract`).

---

## Create Contract

Creates a sponsorship contract. A Yearly Company has at most one contract — a second `POST` for the same Yearly Company returns `409 Conflict`.

```
POST /yearly-companies/{id}/contract
```

Request:

```json
{
  "contractDate": "2026-06-01",
  "totalAmount": 95000,
  "remarks": ""
}
```

The request has no assignee. A contract never introduces an assignment of its own; the assignee is always the Yearly Company's current `CompanyAssignment` (`spec/model.md#SponsorshipContract`). A contract can be created while the Yearly Company has no assignee.

Writes a `CONTRACT_CREATED` Activity Log whose actor is the authenticated user who created the contract.

Side effect: sets `YearlyCompany.progress` to `CONFIRMED` (the contract's existence *is* what "confirmed" means — `spec/domain.md#Sponsorship Contract`). If previous progress was not already `CONFIRMED`, also sends a Slack mention to the assigned Sponsorship Member (UC-16, FR-014). Slack failure does not fail this request.

Trigger (why the member creates the contract — not an automated import):

* Google Forms submission (read by the member, transcribed by hand — UC-06)
* Manual registration by sponsorship member (email / face-to-face agreement)

---

## Update Contract

Updates contract information.

```
PATCH /contracts/{contractId}
```

Writes a `CONTRACT_UPDATED` Activity Log when `contractDate` or `remarks` actually changes.

`totalAmount` is maintained by the server as the sum of `quantity * unitPrice` across the contract's Contract Menus (`spec/model.md#ContractMenu`) — it is accepted at creation as an initial value, but recalculated automatically whenever Contract Menus are added, updated, or removed (see Add Contract Menu below). Clients should treat it as read-only after creation.

If the contract already has a `WAITING` Payment, that Payment's `amount` is synchronized to the recalculated `totalAmount` in the same transaction as the Contract Menu change. If the contract has a `CONFIRMED` Payment and the recalculated total would differ from the confirmed Payment amount, the Contract Menu change is rejected with `409 Conflict`; AdAdd must not silently leave a confirmed payment inconsistent with the contract.

---

# Sponsorship Menu API

## List Sponsorship Menus

Returns available sponsorship menus for a year.

```
GET /years/{yearId}/sponsorship-menus
```

Example response:

```json
[
  {
    "id": "menu_id",
    "name": "パンフレット広告1P",
    "requiresSubmission": true,
    "defaultPrice": 80000,
    "maxQuantity": null
  }
]
```

`maxQuantity` is an optional sponsorship cap (`null` = unlimited) — see `spec/model.md#SponsorshipMenu`. Accepted on Create/Update; omitted or `null` means unlimited. Values must be an integer ≥ 1. Surfaced as a fill-ratio on `spec/frontend.md#Ad Material Progress`.

---

## Create Sponsorship Menu

Creates a new yearly sponsorship menu.

```
POST /years/{yearId}/sponsorship-menus
```

Permission:

* Sponsorship Member / Administrator

Example request:

```json
{
  "name": "企業ブース",
  "defaultPrice": 50000,
  "requiresSubmission": false,
  "isActive": true,
  "maxQuantity": 8
}
```

Omit `maxQuantity` (or send `null`) for an unlimited menu.

---

## Update Sponsorship Menu

```
PATCH /sponsorship-menus/{menuId}
```

Accepts the same fields as Create, including `maxQuantity` (`null` clears the cap).

Changing `requiresSubmission` does not rewrite existing Contract Menus that reference this menu; their `productionType` and `status` stay as stored. Setting `isActive` to `false` stops the menu from being added to contracts (see Add Contract Menu) without touching existing Contract Menus.

---

## Copy Sponsorship Menus from the Previous Year

Copies the Sponsorship Menus of the Year immediately preceding `yearId` into `yearId` (`spec/domain.md#Copying Menus from the Previous Year`). It is run by hand after a new Year is created; Create Year never copies menus. The copied menus are then edited as usual (Update Sponsorship Menu), e.g. to change prices.

```
POST /years/{yearId}/sponsorship-menus/copy-from-previous-year
```

No request body. Each source menu becomes a new Sponsorship Menu in `yearId` with the same `name`, `defaultPrice`, `requiresSubmission`, `isActive`, and `maxQuantity`. The source Year's menus are not changed.

`yearId` must be the active Year — a past Year is rejected with `409 CONFLICT` (see Past Years Are Read-Only). A Year with no preceding Year returns `409 CONFLICT`.

Not decided yet (Issue #172): what happens when the target Year already has a menu with the same name (menu names are unique within a Year), and whether menus with `isActive = false` are copied.

Permission:

* Sponsorship Member / Administrator — the same as Create Sponsorship Menu

---

## Delete Sponsorship Menu

```
DELETE /sponsorship-menus/{menuId}
```

Deletion is for removing a mistaken registration. A Sponsorship Menu referenced by any Contract Menu is rejected with `409 Conflict`; to stop offering such a menu, set `isActive` to `false` instead. An unknown `menuId` returns `404`.

Permission:

* Administrator only — see Authorization Matrix (deletion is Administrator-only system-wide). Sponsorship Member's "Manage menus" access is create/update only.

---

# Contract Menu API

## List Contract Menus

Returns the Contract Menus belonging to a contract.

```
GET /contracts/{contractId}/menus
```

Example response:

```json
[
  {
    "id": "contract_menu_id",
    "sponsorshipMenuId": "menu_id",
    "quantity": 1,
    "unitPrice": 80000,
    "isGoodsSponsorship": false,
    "productionType": "COMPANY",
    "productionDepartment": null,
    "status": "WAITING",
    "driveUrl": null,
    "remarks": ""
  }
]
```

`status` is one of `WAITING / REQUESTED / PRODUCING / COMPLETED / SUBMITTED`; `productionType` is `COMPANY / INTERNAL` or `null` when the referenced Sponsorship Menu has `requiresSubmission = false` (`spec/model.md#Enumerations`). `productionDepartment` is `DOCUMENT_CREATION_DEPARTMENT / PRODUCTION_BUREAU / SOCIAL_MEDIA_DEPARTMENT`, or `null` — always `null` unless `productionType` is `INTERNAL` (`spec/model.md#ContractMenuProductionDepartment`).

---

## List Contract Menus Across a Year

Returns every Contract Menu contracted during a Year, joined with its Yearly Company / Contract for cross-contract views (see `spec/frontend.md#Contract Menu List` — used by Sponsorship Members to track production/submission status across all companies at once, UC-07/UC-08).

```
GET /years/{yearId}/contract-menus
```

Query:

| Parameter          | Description                    |
| ------------------- | ------------------------------- |
| companyName         | Company name search (substring) |
| sponsorshipMenuId   | Filter by Sponsorship Menu       |
| status              | Filter by Contract Menu status   |
| productionType      | Filter by production type        |

`productionType=INTERNAL` matches every `INTERNAL` Contract Menu, whether or not `productionDepartment` is assigned and whichever department it is. A filter by `productionDepartment` is not designed (未決).

Each item additionally includes `companyName`, `yearlyCompanyId`, `assignedMemberId`, and `assignedMemberName` (joined from the owning Contract's Yearly Company and its CompanyAssignment), and `sponsorshipMenuName` (joined from the referenced Sponsorship Menu) so the list doesn't require a second round trip per row.

A Contract Menu whose Sponsorship Menu has since been deleted is excluded from this list — it never shows a stale or missing `sponsorshipMenuName`.

---

## Add Contract Menu

Adds a sponsorship menu to a contract.

```
POST /contracts/{contractId}/menus
```

Request:

```json
{
  "sponsorshipMenuId": "menu_id",
  "quantity": 1,
  "unitPrice": 80000,
  "isGoodsSponsorship": false,
  "productionType": "COMPANY"
}
```

`unitPrice` defaults to the referenced `SponsorshipMenu.defaultPrice` when omitted (`spec/model.md#ContractMenu`). When `isGoodsSponsorship` is true, `unitPrice` is forced to `0` (goods sponsorship must not inherit `defaultPrice`). `sponsorshipMenuId` must belong to the same Year as the contract's Yearly Company. A Sponsorship Menu with `isActive = false` is rejected with `409 CONFLICT`. `productionDepartment` is not part of this request — a new Contract Menu always starts with `productionDepartment = null`, and the department is assigned afterwards (Assign Contract Menu Production Department below). Adding a Contract Menu recalculates the parent Contract's `totalAmount` (see Update Contract above) and applies the Payment synchronization / confirmed-payment conflict rule described there.

Writes a `CONTRACT_MENU_ADDED` Activity Log.

---

## Update Contract Menu

Edits an existing Contract Menu (e.g. quantity, goods-sponsorship flag, production type — corrected after creation, distinct from the status/production sub-resources below).

```
PATCH /contract-menus/{id}
```

Request (all fields optional):

```json
{
  "quantity": 2,
  "unitPrice": 80000,
  "isGoodsSponsorship": false,
  "productionType": "COMPANY"
}
```

Same `unitPrice`/`isGoodsSponsorship` defaulting rule as Add Contract Menu. Recalculates the parent Contract's `totalAmount` and applies the Payment synchronization / confirmed-payment conflict rule described in Update Contract above.

`productionDepartment` and `status` are not part of this request; they have their own endpoints below, with narrower permissions. When this request changes `productionType` from `INTERNAL` to another value, the server sets `productionDepartment` to `null` in the same update (`spec/model.md#ContractMenu`).

Writes a `CONTRACT_MENU_UPDATED` Activity Log when `quantity` or `unitPrice` actually changes (including a `unitPrice` forced to `0` by `isGoodsSponsorship`).

Permission:

* Sponsorship Member / Administrator — every field
* Advertisement Manager — `productionType` only (the 広告管理 screen's production type cell). `quantity`, `unitPrice`, and `isGoodsSponsorship` change the Contract's amount and stay Sponsorship Member / Administrator work: a request containing any of them from a User who holds Advertisement Manager without Sponsorship Member (or Administrator) returns `403 Forbidden`.

---

## Delete Contract Menu

Removes a Contract Menu and recalculates the parent Contract's `totalAmount`, applying the Payment synchronization / confirmed-payment conflict rule described in Update Contract.

```
DELETE /contract-menus/{id}
```

Writes a `CONTRACT_MENU_REMOVED` Activity Log.

Permission:

* Administrator only — see Authorization Matrix (deletion is Administrator-only system-wide). Exposed as a per-line UI action on Yearly Company Detail, shown only to Administrator and guarded by a confirmation step (`spec/frontend.md#Yearly Company Detail`).

---

## Update Contract Menu Status

Updates production progress.

```
PATCH /contract-menus/{id}/status
```

Example:

```json
{
  "status": "COMPLETED"
}
```

Any `ContractMenuStatus` may be set from any other, forward or back. The order is not enforced, because material is sent back and redone (`spec/model.md#ContractMenu`).

Permission:

* Advertisement Manager / Administrator (superuser)

Every other Role, Sponsorship Member included, receives `403 Forbidden`. The restriction is enforced in the backend, not only by hiding the control (Issue #126).

---

## Assign Contract Menu Production Department

Assigns, changes, or clears the committee department that produces an `INTERNAL` Contract Menu (`spec/domain.md#Contract Menu Production Department`, Issue #127).

```
PATCH /contract-menus/{id}/production-department
```

Request:

```json
{
  "productionDepartment": "PRODUCTION_BUREAU"
}
```

`productionDepartment` is one of `DOCUMENT_CREATION_DEPARTMENT / PRODUCTION_BUREAU / SOCIAL_MEDIA_DEPARTMENT`, or `null` to clear it. `productionType` is not changed — it stays `INTERNAL`.

Validation:

* The Contract Menu's `productionType` must be `INTERNAL`. Otherwise (`COMPANY`, `CONTINUED` — present in code, its place in spec is Issue #162 — or `null` because the menu does not require submission) the request returns `400 Bad Request` — a department cannot be assigned. Clearing with `null` follows the same rule.
* An unknown value returns `400 Bad Request`.

Does not change `totalAmount` and does not create an Activity Log entry (production changes are outside the recorded scope; whether to record them is undecided — Issue #172). Rejected for a past Year like every other Contract Menu write (Past Years Are Read-Only above).

Permission:

* Advertisement Manager / Administrator (superuser)

Every other Role, Sponsorship Member included, receives `403 Forbidden`.

---

## Upload Production Information

Registers production-related information.

```
PATCH /contract-menus/{id}/production
```

Request:

```json
{
  "driveFolderUrl": "https://drive.google.com/...",
  "remarks": "企業確認済み"
}
```

This call and `POST /contract-menus/{id}/drive-upload` do not change `status` and write no Activity Log entry (Issue #166). A Contract Menu becomes `SUBMITTED` only through Update Contract Menu Status above, by Advertisement Manager / Administrator.

Permission (both calls):

* Sponsorship Member / Advertisement Manager / Administrator

---

# Payment API

## Get Payment Status

```
GET /contracts/{contractId}/payment
```

Example response:

```json
{
  "id": "payment_id",
  "contractId": "contract_id",
  "amount": 100000,
  "receivedAmount": 99340,
  "remarks": "振込手数料 660 円を差し引いて入金",
  "status": "WAITING",
  "confirmedAt": null,
  "confirmedById": null,
  "confirmedByName": null
}
```

`amount` is the billed amount (the contract total). `receivedAmount` is the amount actually received, `null` until the Finance Department records it. The difference is not returned; clients compute `receivedAmount − amount` for display (`spec/model.md#Payment`).

Returns `404` if the contract has no Payment (e.g. a goods-sponsorship-only contract with `totalAmount = 0` — see Create Payment below).

---

## List Payments Across a Year

Returns every Payment for a Year's Contracts, joined with Company / Yearly Company / confirming User for cross-contract views (see `spec/frontend.md#Finance Management` — used by the Finance Department to track income confirmation across every Company at once, UC-09; also the data source for Dashboard's payment counts, spec/frontend.md#Dashboard).

```
GET /years/{yearId}/payments
```

Query:

| Parameter | Description            |
| --------- | ----------------------- |
| status    | Filter by Payment status |

Each item additionally includes `companyName`, `companyNameKana` (for bank-transfer-record matching, see `spec/frontend.md#Payment List`) and `yearlyCompanyId` (joined from the owning Contract's Yearly Company), `assignedMemberName` (joined from the Yearly Company's `CompanyAssignment`), and `confirmedByName` (joined from the confirming User, when set) so the list doesn't require a second round trip per row. `receivedAmount` and `remarks` are included as on Get Payment Status.

A Payment whose Contract's Yearly Company has since been deleted is excluded from this list.

---

## Create Payment

Creates the Payment record for a contract, once its Contract Menus are in place and `totalAmount > 0` (`spec/domain.md#Sponsorship Contract`). `amount` defaults to the contract's current `totalAmount`. A contract has at most one Payment — a second `POST` returns `409 Conflict`; contracts with `totalAmount = 0` (goods-sponsorship-only) should not call this endpoint.

While the Payment remains `WAITING`, later Contract Menu changes keep `Payment.amount` synchronized with the contract total. After the Payment is `CONFIRMED`, Contract Menu changes that would alter the total return `409 Conflict` until Finance moves the Payment back to `WAITING`.

```
POST /contracts/{contractId}/payment
```

Response `status` starts at `WAITING`, with `receivedAmount` `null` and `remarks` empty.

Side effect: if the Yearly Company's `progress` is `GOODS_RECEIVED`, it moves back to `CONFIRMED` — a contract with a Payment progresses through the payment stages (see Update Sponsorship Progress).

---

## Update Payment Status

```
PATCH /payments/{paymentId}
```

Permission:

* Finance Department

Confirms a payment once the Finance Department has verified the bank transfer (see `spec/usecase.md` UC-09). `confirmedAt`/`confirmedById` are set server-side from the authenticated user and current timestamp — not part of the request body. `status` is one of `WAITING / CONFIRMED` only (no `CANCELLED`). Moving `status` back to `WAITING` clears `confirmedAt`/`confirmedById` server-side.

Side effects on `YearlyCompany.progress`, in the same transaction, so that progress always matches the Payment (`spec/domain.md` → Lifecycle → Sponsorship Progress Consistency):

* `status` becomes `CONFIRMED` → `progress` becomes `PAYMENT_RECEIVED` (協賛金入金). If `progress` is already `RECEIPT_SENT` (領収書送付), it is kept.
* `status` moves from `CONFIRMED` back to `WAITING` → if `progress` is `PAYMENT_RECEIVED` or `RECEIPT_SENT`, it becomes `CONFIRMED` (協賛確定). Other values are kept.

Each actual progress change writes a `PROGRESS_UPDATED` Activity Log, in addition to `PAYMENT_STATUS_UPDATED`. The rule follows the `status` change however it is triggered, including when the actual received amount decides it (Issue #171). Whether the move back to `CONFIRMED` sends the Slack mention (FR-014) is not decided (Issue #172).

Example:

```json
{
  "status": "CONFIRMED"
}
```

The request may also carry `receivedAmount` and `remarks` (each optional; omitted fields are unchanged), with or without a `status` change (Issue #171):

```json
{
  "receivedAmount": 99340,
  "remarks": "振込手数料 660 円を差し引いて入金",
  "status": "CONFIRMED"
}
```

* `receivedAmount` may differ from `amount`. A difference does not reject the request — confirming with a bank-fee deduction or an overpayment is allowed, with the reason in `remarks`.
* For a split payment, `receivedAmount` is sent as the cumulative total received so far, with `status` left `WAITING` until the full amount is in. There is no partial-payment status.
* `amount` is not part of this request. It stays synchronized from the contract total (Create Payment above).
* **`receivedAmount` is required to confirm.** A change to `CONFIRMED` is rejected with HTTP 400 if, after applying the request, `receivedAmount` would be `null`. The UI pre-fills the input with `amount` (the billed amount).
* `receivedAmount` and `remarks` can be changed while the Payment stays `CONFIRMED` — send them without `status`. The Payment does not need to go back to `WAITING`.
* Moving `status` back to `WAITING` keeps `receivedAmount`.
* Every change of `receivedAmount` or `remarks` is recorded in 活動記録 as `PAYMENT_DETAILS_UPDATED` (event type defined with Issue #172).

---

# Progress API

## Get Sponsorship Progress

Returns the Yearly Company's current sponsorship progress.

```
GET /yearly-companies/{id}/progress
```

Example:

```json
{
  "progress": "PAYMENT_RECEIVED"
}
```

`progress` is one of `NOT_CONTACTED / MATERIALS_SENT / CONFIRMED / GOODS_RECEIVED / INVOICE_SENT / PAYMENT_RECEIVED / RECEIPT_SENT / DECLINED / PENDING` (`spec/model.md#Enumerations` → `SponsorshipProgress`). This endpoint returns only the current value; historical events are handled by Activity Log APIs below.

---

## Update Sponsorship Progress

```
PATCH /yearly-companies/{id}/progress
```

Example:

```json
{
  "progress": "MATERIALS_SENT"
}
```

Consistency with the contract (`spec/domain.md` → Lifecycle → Sponsorship Progress Consistency) — rejected with `409 CONFLICT`:

* `progress` = `CONFIRMED` while the Yearly Company has no contract. Create the contract instead; that sets `CONFIRMED`.
* `progress` = `NOT_CONTACTED`, `MATERIALS_SENT`, `DECLINED`, or `PENDING` (pre-contract stages) while a contract exists. If the company declines after contracting, the contract must be deleted first. `INVOICE_SENT` is a post-contract stage and is allowed while a contract exists.
* `progress` = `PAYMENT_RECEIVED` unless the contract's Payment is `CONFIRMED` (also when there is no contract or no Payment). It is reached only by confirming the Payment (Update Payment Status).
* `progress` = `RECEIPT_SENT` when there is no contract, or while the contract's Payment is not `CONFIRMED`. Whether a goods-only contract (no Payment) may use `RECEIPT_SENT` is not decided (Issue #172).
* `progress` = `GOODS_RECEIVED` (物品受領) when there is no contract, or the contract has a Payment. It is set by hand, only for goods-only contracts, and may be set back to `CONFIRMED` by hand.

When Create Payment creates a Payment for a contract whose Yearly Company is at `GOODS_RECEIVED` (a paid Contract Menu was added), `progress` moves back to `CONFIRMED` in the same transaction and writes a `PROGRESS_UPDATED` Activity Log.

Side effect: when `progress` changes to `CONFIRMED` from any other value, send a Slack mention to the assigned Sponsorship Member (UC-16, FR-014). A no-op if Slack is not configured, if nobody is assigned, or if they have no `slackId`. Slack failure does not fail this request.

Writes a `PROGRESS_UPDATED` Activity Log only when the value actually changes.

---

# Activity Log API（活動記録）

## List Activity Logs for a Yearly Company

Returns 活動記録 entries for the target Yearly Company, newest first.

```
GET /yearly-companies/{id}/activity-logs
```

Response item example:

```json
{
  "id": "activity_log_id",
  "yearlyCompanyId": "yearly_company_id",
  "eventType": "PROGRESS_UPDATED",
  "message": "進捗を「資料送付」から「請求書送付」に更新",
  "createdAt": "2026-07-28T07:20:00Z",
  "createdById": "user_id",
  "createdByName": "田中"
}
```

Entries are exclusively system-generated. There is no manual/user-authored entry endpoint — a free-text handover note belongs on `Company.memo` instead (`spec/model.md#Company`).

`message` is written in Japanese using the same business labels as the UI (`spec/frontend.md` Principle 2). Legacy English messages (`Progress changed from …`, `Member assigned to YearlyCompany`, …) and raw-enum Japanese (`進捗を MATERIALS_SENT から …`) are normalized to business labels on read — rows are not UPDATEd. `createdAt` is ISO-8601; the UI always displays it in JST (Asia/Tokyo).

`eventType` is one of:

| eventType | Written when |
| --- | --- |
| `PROGRESS_UPDATED` | `YearlyCompany.progress` changes, by hand or as a side effect of Create Contract / Update Payment Status |
| `COMPANY_STATUS_UPDATED` | `YearlyCompany.companyStatus` changes |
| `PHASE_UPDATED` | `YearlyCompany.phase` changes |
| `COMPANY_CONTACT_UPDATED` | the Yearly Company's contact information changes (Update Yearly Company Contact) |
| `ASSIGNMENT_UPDATED` | CompanyAssignment is set or cleared |
| `CONTRACT_CREATED` | a Sponsorship Contract is created (actor = who made the contract) |
| `CONTRACT_UPDATED` | a contract's `contractDate` or `remarks` changes |
| `CONTRACT_MENU_ADDED` | a Contract Menu is added |
| `CONTRACT_MENU_UPDATED` | a Contract Menu's `quantity` or `unitPrice` changes |
| `CONTRACT_MENU_REMOVED` | a Contract Menu is deleted |
| `CONTRACT_MENU_STATUS_UPDATED` | a Contract Menu's status changes |
| `PAYMENT_STATUS_UPDATED` | a Payment is confirmed, or moved back from `CONFIRMED` to `WAITING` |
| `PAYMENT_DETAILS_UPDATED` | a Payment's actual received amount or remarks change (the fields are defined by Issue #170 / #171) |

An entry is written only when the value actually changes; saving the same value writes nothing. The `message` names what changed in business language (e.g. `「パンフレット広告1P」の数量を「1」から「2」に更新`, `入金確認を取り消し`).

Not recorded: Contract Menu `productionType`, Drive / production information (`PATCH /contract-menus/{id}/production`, `drive-upload` — these do not change the Contract Menu status), and `PATCH /companies/{companyId}` (Company master only — there is no Yearly Company to attach the entry to). Whether to record these is not decided (Issue #172).

`MANUAL_NOTE` may appear on rows written before manual entry was removed; new rows never use it.

Persistence columns remain `action` / `description` / `user_id` (`spec/model.md#ActivityLog`). This endpoint maps them to `eventType` / `message` / `createdById`, and joins `createdByName`. Legacy `action` values (`UPDATE_PROGRESS`, `ASSIGNED_MEMBER`, `CONTRACT_MENU_SUBMITTED`, …) are normalized to the table above on read.

---

# Integration API

The following bulk Google Workspace gateways are **not implemented**. They are Future Extensions (see below). Day-to-day Google usage goes through other paths.

* Google Forms — members transcribe responses into AdAdd (UC-06). There is no `POST /integrations/google/forms/import`.
* Google Sheets — Company and User bulk load is CSV Preview → Confirm (`spec/frontend.md#CSV Import / Export`), not a live Sheets connection. There is no `POST /integrations/google/sheets/import`.
* Google Drive — Contract Menu submission uses `PATCH /contract-menus/{id}/production` (URL) and `POST /contract-menus/{id}/drive-upload` (file). There is no `POST /integrations/google/drive/link`.

Slack mentions (UC-16) are not an Integration REST resource. They are a side effect of progress becoming Confirmed — see Update Sponsorship Progress and Create Sponsorship Contract above.

---

# Authorization Matrix

| Function                        | (no Role) | Sponsorship Member | Advisor | Finance | Advertisement Manager    | Administrator |
| -------------------------------- | --------- | ------------------- | ------- | ------- | ------------------------ | -------------- |
| View assigned companies         | ○         | ○                   | ○       | △       | ○                        | ○              |
| Manage company master data      | -         | ○                   | -       | -       | -                        | ○              |
| Create Year                     | -         | -                   | -       | -       | -                        | ○              |
| Update document issuer information (Year) | - | -             | -       | -       | -                        | ○              |
| Assign companies / advisors     | -         | -                   | -       | -       | -                        | ○              |
| Update Year (name / period, active Year only) | - | -         | -       | -       | -                        | ○              |
| Manage Sponsorship Menus, add Contract Menus — create/update only | - | ○ | - | - | - | ○ |
| Copy Sponsorship Menus from the previous Year | - | ○         | -       | -       | -                        | ○              |
| Edit Contract Menu quantity / unit price / goods sponsorship | - | ○ | - | - | -  | ○ |
| Edit Contract Menu production type | -       | ○                   | -       | -       | ○                        | ○              |
| Update production information (remarks, Drive URL) / Drive upload | - | ○ | - | - | ○ | ○ |
| Update Contract Menu status     | -         | -                   | -       | -       | ○                        | ○              |
| Assign Contract Menu production department | - | -             | -       | -       | ○                        | ○              |
| Create payment                  | -         | ○                   | -       | ○       | -                        | ○              |
| Update payment status            | -         | -                   | -       | ○       | -                        | ○              |
| Manage users / Roles            | -         | -                   | -       | -       | -                        | ○              |
| Delete any record (Company, Sponsorship Menu, Contract Menu, AdvisorAssignment, UserRole, ...) | - | - | - | - | - | ○ |

Deletion is Administrator-only system-wide — every other Role's "manage" access (row above) is create/update, never delete (`spec/model.md` Business Invariants).

Contract Menu status and production department belong to Advertisement Manager (`ADVERTISEMENT_MANAGER`, 広告管理部門) and Administrator only; a Sponsorship Member receives `403` for both (Issue #126, #127). On its own, Advertisement Manager covers every operation of the 広告管理 screen (`spec/frontend.md#Contract Menu List`) — status, production department, production type, production information, Drive upload — because a User may hold it without Sponsorship Member (cooperation with other bureaus such as the SNS部門). Usually it is held together with Sponsorship Member.

Money-related Contract Menu edits — `quantity`, `unitPrice`, `isGoodsSponsorship`, which change `totalAmount` and a Waiting Payment's amount — are not part of Advertisement Manager. A User holding Advertisement Manager alone receives `403` for them.

These 5 columns are the canonical Role set — see `spec/domain.md#Role` and `spec/model.md#Role`. Holding none of them (the "(no Role)" column) is the view-only baseline that replaced the earlier General Member Role. Company Management Department and Sponsorship Menu Management Team, previously separate columns, were removed — their responsibilities folded into Sponsorship Member (company/menu master data) and Administrator (Year creation, company/advisor assignment).

---

# API Design Rules

## Rule 1

Do not expose database tables directly.

Bad:

```
GET /contract_menus
```

Good:

```
GET /contracts/{id}/menus
```

---

## Rule 2

Business operations should be represented as APIs.

Example:

Bad:

```
PATCH /company/status
```

Good:

```
PATCH /yearly-companies/{id}/phase
```

---

## Rule 3

All domain changes must update:

* domain.md
* model.md
* er.md
* database.md
* api.md

---

# Future Extensions

Potential future APIs:

* Google Forms application import (`POST /integrations/google/forms/import`) — blocked on company-name matching between Forms and Company master
* Google Sheets live import (`POST /integrations/google/sheets/import`) — CSV bulk import already covers initial load
* Gmail communication history integration
* Automatic bank transfer confirmation
* Dashboard analytics

Invoice/Receipt PDF generation (FR-015, UC-17, UC-10) needs no generation endpoint — it is generated client-side from data already returned by the existing Sponsorship Contract / Contract Menu / Payment / Company / Year GET endpoints above. The issuer information and bank transfer account come from `GET /years` (Year fields). The receipt's seal image is a static frontend file, not an API resource.
