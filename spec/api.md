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

`{token}` is an AdAdd-issued JWT, not a Google token — see Login below. In development only, `X-User-ID` / `X-User-Roles` headers may be sent instead when the server has `DEV_AUTH_ENABLED=true`; this path must be disabled in production.

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

`token` is a signed JWT containing `userId` and the User's current Role `code`s (resolved server-side from `UserRole`, never from anything the client supplies). Every subsequent request must send this token as `Authorization: Bearer {token}`.

If the email has no matching `User`: `403 Forbidden`, `error.code = "FORBIDDEN"`, message indicating the email is not registered — the frontend must not create a session.

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

Returns the fixed set of 7 Roles (`spec/model.md#Role`) — master data, not user-creatable.

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

Permission:

* Administrator

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

Creates many Companies from a CSV in one request (`spec/frontend.md#CSV Import / Export`). Does not create Yearly Companies. Existing one-by-one `POST /companies` stays for individual registration.

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

Each row is independent. Invalid / duplicate rows are returned in `errors` and skipped; valid rows are created. Same response shape as Bulk Import Users (`totalCount` / `successCount` / `errorCount` / `successfulRows` / `errors`). HTTP 400 if the file is missing, not CSV, or has no data rows.

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
  "assigneeId": "user_id",
  "assigneeName": "田中",
  "remarks": ""
}
```

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

`assigneeId` is never part of the request body. It is set server-side from the Sponsorship Member currently assigned to the Yearly Company (`CompanyAssignment`, see Company Assignment API above) — a contract never introduces a new assignment of its own (`spec/model.md#SponsorshipContract`).

Side effect: sets `YearlyCompany.progress` to `CONFIRMED` (the contract's existence *is* what "confirmed" means — `spec/domain.md#Sponsorship Contract`).

Trigger:

* Google Forms submission
* Manual registration by sponsorship member

---

## Update Contract

Updates contract information.

```
PATCH /contracts/{contractId}
```

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
    "status": "WAITING",
    "driveFolderId": "folder_id",
    "files": [
      {
        "driveUrl": "https://drive.google.com/...",
        "driveFileName": "広告データ.pdf"
      }
    ],
    "remarks": ""
  }
]
```

`status` is one of `WAITING / REQUESTED / PRODUCING / COMPLETED / SUBMITTED`; `productionType` is `COMPANY / INTERNAL` or `null` when the referenced Sponsorship Menu has `requiresSubmission = false` (`spec/model.md#Enumerations`).

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

`unitPrice` defaults to the referenced `SponsorshipMenu.defaultPrice` when omitted (`spec/model.md#ContractMenu`). When `isGoodsSponsorship` is true, `unitPrice` is forced to `0` (goods sponsorship must not inherit `defaultPrice`). `sponsorshipMenuId` must belong to the same Year as the contract's Yearly Company. Adding a Contract Menu recalculates the parent Contract's `totalAmount` (see Update Contract above) and applies the Payment synchronization / confirmed-payment conflict rule described there.

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

Permission:

* Sponsorship Member / Administrator

---

## Delete Contract Menu

Removes a Contract Menu and recalculates the parent Contract's `totalAmount`, applying the Payment synchronization / confirmed-payment conflict rule described in Update Contract.

```
DELETE /contract-menus/{id}
```

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

---

## Add Production File

Appends a new production-related file to the Contract Menu. Registering a file automatically changes the `status` to `SUBMITTED`.

```
POST /contract-menus/{id}/files
```

Request:

```json
{
  "driveUrl": "https://drive.google.com/...",
  "driveFileName": "広告データ.pdf"
}
```

(Note: Actual physical upload may be handled by another specialized endpoint like `/contract-menus/{id}/drive-upload` depending on frontend integration, but the resulting state is adding a file reference here.)

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
  "status": "WAITING",
  "confirmedAt": null,
  "confirmedById": null,
  "confirmedByName": null
}
```

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

Each item additionally includes `companyName`, `companyNameKana` (for bank-transfer-record matching, see `spec/frontend.md#Payment List`) and `yearlyCompanyId` (joined from the owning Contract's Yearly Company), `assignedMemberName` (joined from the Yearly Company's `CompanyAssignment`), and `confirmedByName` (joined from the confirming User, when set) so the list doesn't require a second round trip per row.

A Payment whose Contract's Yearly Company has since been deleted is excluded from this list.

---

## Create Payment

Creates the Payment record for a contract, once its Contract Menus are in place and `totalAmount > 0` (`spec/domain.md#Sponsorship Contract`). `amount` defaults to the contract's current `totalAmount`. A contract has at most one Payment — a second `POST` returns `409 Conflict`; contracts with `totalAmount = 0` (goods-sponsorship-only) should not call this endpoint.

While the Payment remains `WAITING`, later Contract Menu changes keep `Payment.amount` synchronized with the contract total. After the Payment is `CONFIRMED`, Contract Menu changes that would alter the total return `409 Conflict` until Finance moves the Payment back to `WAITING`.

```
POST /contracts/{contractId}/payment
```

Response `status` starts at `WAITING`.

---

## Update Payment Status

```
PATCH /payments/{paymentId}
```

Permission:

* Finance Department

Confirms a payment once the Finance Department has verified the bank transfer (see `spec/usecase.md` UC-09). `confirmedAt`/`confirmedById` are set server-side from the authenticated user and current timestamp — not part of the request body. `status` is one of `WAITING / CONFIRMED` only (no `CANCELLED`). Moving `status` back to `WAITING` clears `confirmedAt`/`confirmedById` server-side — it never touches `YearlyCompany.progress` (see `spec/frontend.md#Finance Management`).

Example:

```json
{
  "status": "CONFIRMED"
}
```

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

`progress` is one of `NOT_CONTACTED / MATERIALS_SENT / CONFIRMED / INVOICE_SENT / PAYMENT_RECEIVED / RECEIPT_SENT / DECLINED / PENDING` (`spec/model.md#Enumerations` → `SponsorshipProgress`). This endpoint returns only the current value; historical events are handled by Activity Log APIs below.

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
| `PROGRESS_UPDATED` | `YearlyCompany.progress` changes |
| `COMPANY_STATUS_UPDATED` | `YearlyCompany.companyStatus` changes |
| `PHASE_UPDATED` | `YearlyCompany.phase` changes |
| `ASSIGNMENT_UPDATED` | CompanyAssignment is set or cleared |
| `CONTRACT_CREATED` | a Sponsorship Contract is created |
| `CONTRACT_MENU_STATUS_UPDATED` | a Contract Menu's status changes |
| `PAYMENT_STATUS_UPDATED` | a Payment is confirmed |

`MANUAL_NOTE` may appear on rows written before manual entry was removed; new rows never use it.

Persistence columns remain `action` / `description` / `user_id` (`spec/model.md#ActivityLog`). This endpoint maps them to `eventType` / `message` / `createdById`, and joins `createdByName`. Legacy `action` values (`UPDATE_PROGRESS`, `ASSIGNED_MEMBER`, `CONTRACT_MENU_SUBMITTED`, …) are normalized to the table above on read.

---

# Integration API

## Google Forms Import

Imports sponsorship applications.

```
POST /integrations/google/forms/import
```

Process:

```
Google Forms
      ↓
API
      ↓
SponsorshipContract
      ↓
ContractMenu
      ↓
Slack notification to assigned Sponsorship Member(s) (see FR-014, UC-16)
```

---

## Google Sheets Import

Imports existing company data.

```
POST /integrations/google/sheets/import
```

Purpose:

* Initial migration
* Existing company database import

---

## Google Drive Link Registration

Registers Drive information.

```
POST /integrations/google/drive/link
```

---

# Authorization Matrix

| Function                        | (no Role) | Sponsorship Member | Advisor | Finance | Administrator |
| -------------------------------- | --------- | ------------------- | ------- | ------- | -------------- |
| View assigned companies         | ○         | ○                   | ○       | △       | ○              |
| Manage company master data      | -         | ○                   | -       | -       | ○              |
| Create Year                     | -         | -                   | -       | -       | ○              |
| Assign companies / advisors     | -         | -                   | -       | -       | ○              |
| Manage menus (Sponsorship Menu / Contract Menu) — create/update only | - | ○ | - | - | ○ |
| Create payment                  | -         | ○                   | -       | ○       | ○              |
| Update payment status            | -         | -                   | -       | ○       | ○              |
| Manage users / Roles            | -         | -                   | -       | -       | ○              |
| Delete any record (Contract Menu, AdvisorAssignment, UserRole, ...) | - | - | - | - | ○ |

Deletion is Administrator-only system-wide — every other Role's "manage" access (row above) is create/update, never delete (`spec/model.md` Business Invariants).

These 4 columns are the canonical Role set — see `spec/domain.md#Role` and `spec/model.md#Role`. Holding none of them (the "(no Role)" column) is the view-only baseline that replaced the earlier General Member Role. Company Management Department and Sponsorship Menu Management Team, previously separate columns, were removed — their responsibilities folded into Sponsorship Member (company/menu master data) and Administrator (Year creation, company/advisor assignment).

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

* Gmail communication history integration
* Automatic bank transfer confirmation
* Dashboard analytics
* CSV export

Invoice/Receipt PDF generation (FR-015, UC-17, UC-10) needs no new API endpoint — it is generated client-side from data already returned by the existing Sponsorship Contract / Contract Menu / Payment / Company GET endpoints above.
