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
    "code": "RESOURCE_NOT_FOUND",
    "message": "Company not found"
  }
}
```

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
  "department": {
    "id": "department_id",
    "name": "企業管理部門"
  },
  "roles": [
    "COMPANY_MANAGER"
  ]
}
```

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

Role assignment is not yet implemented — see `spec/usecase.md` UC-12 Notes.

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

Side effect: bulk-generates a `YearlyCompany` for every existing `Company` (see `spec/usecase.md` UC-01, `spec/domain.md#Yearly Company`). For each Company, `companyStatus` is computed automatically (Continuing/New — never Dormant, see `spec/model.md#Value Objects` → `CompanyStatus`), `phase` defaults to `PHASE_3`, and `progress` defaults to `NOT_CONTACTED`.

Permission:

* Company Management Department / Admin

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

## Create Company

Creates new company master data.

```
POST /companies
```

Permission:

* Company Management Department

---

## Update Company

Updates company master data.

```
PATCH /companies/{companyId}
```

---

# Yearly Company API

## List Yearly Companies

Returns companies participating in a specific year.

```
GET /years/{yearId}/companies
```

Query:

| Parameter     | Description                              |
| ------------- | ----------------------------------------- |
| companyStatus | Company relationship history              |
| phase         | Sponsorship outreach priority (this Year)  |
| assignee      | Sponsorship member                         |

The response joins `Company.companyName` and the assigned member (`CompanyAssignment`, see Company Assignment API below) so each item is self-contained for list display:

```json
{
  "id": "yearly_company_id",
  "yearId": "year_id",
  "companyId": "company_id",
  "companyName": "株式会社長岡テクノ",
  "companyStatus": "CONTINUING",
  "phase": "PHASE_1",
  "progress": "INVOICE_SENT",
  "assignedMemberId": "user_id",
  "assignedMemberName": "田中",
  "notes": ""
}
```

`assignedMemberId`/`assignedMemberName` surface the single assignee from `CompanyAssignment` (0..1 per Yearly Company — see `spec/model.md#CompanyAssignment`).

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

`companyStatus` is computed server-side (Continuing/New, based on whether the Company had a Yearly Company with a Sponsorship Contract in the immediately preceding Year — see `spec/model.md#Value Objects` → `CompanyStatus`) and must not be accepted from the request body. `phase` defaults to `PHASE_3`; `progress` defaults to `NOT_CONTACTED`.

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

`CompanyAssignment` is domain-modeled as 0..1 per Yearly Company (`spec/model.md#CompanyAssignment`), so this endpoint always replaces any existing `CompanyAssignment` for the Yearly Company rather than adding a second row — sending `userId: null` clears the assignment.

Permission:

* Company Management Department

---

## Get Assigned Companies

Returns companies assigned to the current user.

```
GET /users/me/companies
```

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

* Company Management Department

---

## Remove Advisor

Removes a single advisor assignment.

```
DELETE /advisor-assignments/{id}
```

Permission:

* Company Management Department

---

## List Advisor Assignments

Returns every AdvisorAssignment for a Year (used to build the member↔advisor table — see `spec/frontend.md#Advisor Assignment`). A single member may appear multiple times, once per Advisor.

```
GET /advisor-assignments?yearId={yearId}
```

---

## Get Advisor Members

Returns sponsorship members managed by an advisor.

```
GET /users/{userId}/advisor-members
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
    "defaultPrice": 80000
  }
]
```

---

## Create Sponsorship Menu

Creates a new yearly sponsorship menu.

```
POST /years/{yearId}/sponsorship-menus
```

Permission:

* Sponsorship Menu Management Team

---

## Update Sponsorship Menu

```
PATCH /sponsorship-menus/{menuId}
```

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
    "driveUrl": null,
    "remarks": ""
  }
]
```

`status` is one of `WAITING / REQUESTED / PRODUCING / COMPLETED / SUBMITTED`; `productionType` is `COMPANY / INTERNAL` or `null` when the referenced Sponsorship Menu has `requiresSubmission = false` (`spec/model.md#Enumerations`).

---

## List Contract Menus Across a Year

Returns every Contract Menu contracted during a Year, joined with its Yearly Company / Contract for cross-contract views (see `spec/frontend.md#Contract Menu List` — used by the Sponsorship Menu Management Team to track production/submission status across all companies at once, UC-07/UC-08).

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

Each item additionally includes `companyName` and `yearlyCompanyId` (joined from the owning Contract's Yearly Company) so the list doesn't require a second round trip per row.

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

`unitPrice` defaults to the referenced `SponsorshipMenu.defaultPrice` when omitted (`spec/model.md#ContractMenu`). When `isGoodsSponsorship` is true, `unitPrice` is forced to `0` (goods sponsorship must not inherit `defaultPrice`). `sponsorshipMenuId` must belong to the same Year as the contract's Yearly Company. Adding a Contract Menu recalculates the parent Contract's `totalAmount` (see Update Contract above).

---

## Delete Contract Menu

Removes a Contract Menu and recalculates the parent Contract's `totalAmount`.

```
DELETE /contract-menus/{id}
```

Permission:

* Sponsorship Member / Company Management Department

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

## Create Payment

Creates the Payment record for a contract, once its Contract Menus are in place and `totalAmount > 0` (`spec/domain.md#Sponsorship Contract`). `amount` defaults to the contract's current `totalAmount`. A contract has at most one Payment — a second `POST` returns `409 Conflict`; contracts with `totalAmount = 0` (goods-sponsorship-only) should not call this endpoint.

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

`progress` is one of `NOT_CONTACTED / MATERIALS_SENT / CONFIRMED / INVOICE_SENT / PAYMENT_RECEIVED / RECEIPT_SENT / DECLINED / PENDING` (`spec/model.md#Enumerations` → `SponsorshipProgress`). A full change-history timeline is not yet built (UC-14/Activity Log covers this later) — this endpoint returns only the current value.

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

| Function                | General | Sponsorship Member | Advisor | Department Manager | Finance | Admin |
| ------------------------ | ------- | ------------------- | ------- | -------------------- | ------- | ----- |
| View assigned companies | ○       | ○                   | ○       | ○                    | △       | ○     |
| Assign companies        | -       | -                   | -       | ○                    | -       | ○     |
| Manage menus            | -       | -                   | -       | ○                    | -       | ○     |
| Update payment          | -       | -                   | -       | -                    | ○       | ○     |
| Manage users            | -       | -                   | -       | -                    | -       | ○     |

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
