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

---

## Create Yearly Company

Creates a yearly company record.

```
POST /years/{yearId}/companies
```

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

Assigns sponsorship members to companies.

```
POST /yearly-companies/{id}/assignments
```

Request:

```json
{
  "userId": "user_id"
}
```

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

Assigns an advisor to a sponsorship member.

```
POST /advisor-assignments
```

Request:

```json
{
  "advisorUserId": "advisor_id",
  "memberUserId": "member_id"
}
```

Permission:

* Company Management Department

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
  "remarks": ""
}
```

---

## Create Contract

Creates a sponsorship contract.

```
POST /yearly-companies/{id}/contract
```

Trigger:

* Google Forms submission
* Manual registration by sponsorship member

---

## Update Contract

Updates contract information.

```
PATCH /contracts/{contractId}
```

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
    "category": "ADVERTISEMENT",
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
    "productionType": "COMPANY",
    "status": "WAITING",
    "driveUrl": null
  }
]
```

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
  "productionType": "COMPANY"
}
```

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

---

## Update Payment Status

```
PATCH /payments/{paymentId}
```

Permission:

* Finance Department

Example:

```json
{
  "status": "PAID",
  "paidAt": "2026-08-01"
}
```

---

# Progress API

## Get Sponsorship Progress

Returns sponsorship progress.

```
GET /yearly-companies/{id}/progress
```

Example:

```json
{
  "status": "PAYMENT_COMPLETED",
  "history": [
    {
      "status": "DOCUMENT_SENT",
      "date": "2026-06-01"
    }
  ]
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
* PDF generation
* Dashboard analytics
* CSV export
