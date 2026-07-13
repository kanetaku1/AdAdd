# Model

## Purpose

This document defines the conceptual model of AdAdd.

Unlike the domain model, this document describes the entities, attributes, relationships, and constraints that will be implemented in software.

This model is implementation-oriented but independent of any programming language or database.

---

# Model Overview

```text
Year
    │
    ├──── SponsorshipMenu
    │
    └──── YearlyCompany
                │
                ├──── SponsorshipContract
                │            ├──── ContractMenu ──→ SponsorshipMenu
                │            └──── Payment
                │
                ├──── Assignment
                └──── ActivityLog

Company

User
    ├──── Role
    └──── AdvisorAssignment (as Advisor or as Member)
```

---

# Entity

## Year

Represents one festival year.

### Attributes

| Name      | Type    | Required | Description            |
| --------- | ------- | -------- | ---------------------- |
| id        | UUID    | ✓        | Unique identifier      |
| name      | string  | ✓        | Example: 2026          |
| startDate | date    | ✓        | Festival cycle start   |
| endDate   | date    | ✓        | Festival cycle end     |
| isActive  | boolean | ✓        | Current operating year |

---

## Company

Represents a company.

### Attributes

| Name                  | Type     |
| --------------------- | -------- |
| id                    | UUID     |
| companyName           | string   |
| companyNameKana       | string   |
| postalCode            | string   |
| address               | string   |
| phoneNumber           | string   |
| website               | string   |
| contactPersonName     | string   |
| contactEmailOrForm    | string   |
| firstSponsorshipYear  | string   |
| memo                  | text     |
| createdAt             | datetime |
| updatedAt             | datetime |

A Company exists permanently.

`contactPersonName` is the name of the company-side contact person, stored without honorific (e.g. 様) or job title — these are appended when generating outbound communication.

`contactEmailOrForm` holds either the company's contact email address or an inquiry form URL, whichever the company provides.

`firstSponsorshipYear` preserves the year the company first sponsored, including history that predates AdAdd (see `spec/database.md` → Preserve Historical Data). For companies onboarded after AdAdd went live, this is informational; it is not derived from `YearlyCompany` because it must also cover pre-system history.

`memo` consolidates what the legacy spreadsheet tracked as separate 企業詳細 (company details), 備考 (remarks), and 以前の情報 (previous information) columns.

A Company does not store a Slack ID. The Slack ID used for outreach notifications (see FR-014) belongs to the internal Sponsorship Member assigned via `Assignment`, not to the Company — see `User.slackId`.

---

## YearlyCompany

Represents one company's activity during one festival year.

This is the central model of AdAdd.

### Attributes

| Name          | Type     |
| ------------- | -------- |
| id            | UUID     |
| yearId        | UUID     |
| companyId     | UUID     |
| companyStatus | enum     |
| phase         | enum     |
| progress      | enum     |
| notes         | text     |
| createdAt     | datetime |
| updatedAt     | datetime |

YearlyCompany does not reference an Advisor. Advisors are assigned to Sponsorship Members via `AdvisorAssignment`.

`companyStatus` (Continuing / New / Dormant) reflects the company's sponsorship history, independent of `phase`.

`phase` (Phase1 / Phase2 / Phase3) is the outreach priority ranking set by the Company Management Team during the Year preparation period (see `spec/usecase.md` UC-02). It must never be confused with `companyStatus` — a company's history does not determine its phase.

---

## SponsorshipContract

Represents one sponsorship agreement.

### Attributes

| Name            | Type     |
| --------------- | -------- |
| id              | UUID     |
| yearlyCompanyId | UUID     |
| contractDate    | date     |
| totalAmount     | decimal  |
| assigneeId      | UUID     |
| remarks         | text     |

The assignee is scoped to the contract, not to individual Contract Menus. Every Contract Menu under a contract shares the same assignee.

A `SponsorshipContract` record is only created once an agreement is actually reached (see `spec/usecase.md` UC-06) — there is no separate draft state, so no `status` field is needed here. `contractDate` is the single date the agreement was reached. Overall progress (including whether the engagement is fully wrapped up) is tracked on `YearlyCompany.progress`, not duplicated on the contract.

---

## SponsorshipMenu

Represents one type of sponsorship benefit offered during a festival year.

This is master data, managed independently of any company or contract.

### Attributes

| Name               | Type    |
| ------------------ | ------- |
| id                 | UUID    |
| yearId             | UUID    |
| name               | string  |
| defaultPrice       | decimal |
| requiresSubmission | boolean |
| isActive           | boolean |

`requiresSubmission` alone determines the Contract Menu's management workflow (submission/production tracking vs. none) — there is no separate category field. A previous `category` (Advertisement/Booth) enum was removed because it never carried information beyond what `requiresSubmission` already expressed (see `spec/domain.md`).

---

## ContractMenu

Represents one Sponsorship Menu that a company has actually contracted for.

### Attributes

| Name              | Type     |
| ----------------- | -------- |
| id                | UUID     |
| contractId        | UUID     |
| sponsorshipMenuId | UUID     |
| quantity          | integer  |
| unitPrice         | decimal  |
| isGoodsSponsorship | boolean |
| productionType    | enum     |
| status            | enum     |
| driveFolderId     | string   |
| driveUrl          | string   |
| submittedAt       | datetime |
| remarks           | text     |

ContractMenu does not have its own assignee. The assignee belongs to the parent `SponsorshipContract`.

`unitPrice` defaults from the referenced `SponsorshipMenu.defaultPrice` but may be overridden per contract (e.g. a negotiated discount). `SponsorshipContract.totalAmount` is the sum of `quantity * unitPrice` across its Contract Menus.

`isGoodsSponsorship` marks this Contract Menu as a free return for goods sponsorship (物品協賛) rather than a paid item — same `SponsorshipMenu`, but `unitPrice` is conventionally `0` when this is true. This is a per-Contract-Menu flag, not a property of the Sponsorship Menu itself, because the same menu (e.g. a Pamphlet ad) can be sold normally in one contract and given as a goods-sponsorship return in another. The goods received (description, estimated value) are recorded in `SponsorshipContract.remarks`, not here (see `spec/domain.md` → Contract Menu → Goods Sponsorship).

---

## Payment

Represents payment information for a contract's sponsorship amount.

### Attributes

| Name          | Type     |
| ------------- | -------- |
| id            | UUID     |
| contractId    | UUID     |
| amount        | decimal  |
| status        | enum     |
| confirmedAt   | datetime |
| confirmedById | UUID     |

`confirmedById` references the `User` who performed the confirmation (renamed from `confirmedBy` for consistency with `SponsorshipContract.assigneeId`'s `xId`-suffixed foreign-key naming).

`confirmedAt` is the **payment confirmation date** — the date the Finance Department confirmed the bank transfer in AdAdd (`spec/domain.md` → Payment), not necessarily the date the bank transfer itself occurred. It is set automatically to the day the status is changed to Confirmed; there is no separate "actual transfer date" field. This date is used when generating the receipt (`spec/usecase.md` UC-10 Send Receipt).

---

## Assignment

Represents member assignments.

A Yearly Company may have multiple assigned members.

### Attributes

| Name            | Type     |
| --------------- | -------- |
| id              | UUID     |
| yearlyCompanyId | UUID     |
| userId          | UUID     |
| role            | enum     |
| assignedAt      | datetime |

---

## AdvisorAssignment

Represents the supervision relationship between a Sponsorship Advisor and a Sponsorship Member.

An Advisor is assigned to a Member, not to a Yearly Company.

### Attributes

| Name       | Type     |
| ---------- | -------- |
| id         | UUID     |
| yearId     | UUID     |
| advisorId  | UUID     |
| memberId   | UUID     |
| assignedAt | datetime |

---

## ActivityLog

Stores business history.

### Attributes

| Name            | Type     |
| --------------- | -------- |
| id              | UUID     |
| yearlyCompanyId | UUID     |
| userId          | UUID     |
| action          | string   |
| description     | text     |
| createdAt       | datetime |

ActivityLog is append-only.

---

## User

Represents a system user.

### Attributes

| Name      | Type    |
| --------- | ------- |
| id        | UUID    |
| studentId | string  |
| name      | string  |
| email     | string  |
| slackId   | string  |
| isActive  | boolean |

`slackId` is optional (a User may not have linked their Slack account). It is used to send notifications — see `spec/architecture.md` → External Services → Slack.

---

## Role

Represents system permissions.

### Attributes

| Name        | Type   |
| ----------- | ------ |
| id          | UUID   |
| name        | string |
| description | string |

---

# Enumerations

## CompanyStatus

The company's relationship history with the festival. Applies to `YearlyCompany.companyStatus`.

* Continuing
* New
* Dormant

---

## SponsorshipPhase

The outreach priority ranking for a Yearly Company within the current Year, set by the Company Management Team during the preparation period. Applies to `YearlyCompany.phase`. Independent of `CompanyStatus`.

* Phase1
* Phase2
* Phase3

---

## SponsorshipProgress

* NotContacted
* MaterialsSent
* Confirmed
* InvoiceSent
* PaymentReceived
* ReceiptSent
* Declined
* Pending

---

## ContractMenuProductionType

Applies only when the referenced Sponsorship Menu has `requiresSubmission = true`. Chosen by the company on the Google Forms application; determines whether the company's submission is a finished product or raw material (see `spec/business.md` → Contract Menu Production Type).

* Company — company submits a finished product (完成品)
* Internal — company submits raw material (素材) for the committee to produce from

---

## ContractMenuStatus

* Waiting
* Requested
* Producing
* Completed
* Submitted

---

## AssignmentRole

* SponsorshipMember

`Assignment` links a User to a YearlyCompany. Advisor supervision is modeled separately by `AdvisorAssignment`.

---

## PaymentStatus

* Waiting
* Confirmed

---

# Relationships

## Year

```
Year

1 ----- *

YearlyCompany

1 ----- *

SponsorshipMenu
```

---

## Company

```
Company

1 ----- *

YearlyCompany
```

---

## YearlyCompany

```
YearlyCompany

1 ----- *

Assignment

1 ----- *

ActivityLog

1 ----- *

SponsorshipContract
```

---

## SponsorshipContract

```
SponsorshipContract
      │
      ├── ContractMenu (1 ----- *)
      │
      └── Payment (1 ----- *)
```

---

## SponsorshipMenu

```
SponsorshipMenu

1 ----- *

ContractMenu
```

---

## User

```
User

1 ----- *

Assignment

1 ----- *

ActivityLog

1 ----- *

AdvisorAssignment (as Advisor)

1 ----- *

AdvisorAssignment (as Member)
```

---

# Constraints

## Company

* Company name must be unique.

---

## YearlyCompany

* One Company can appear only once in the same Year.
* Company + Year must be unique.

---

## Assignment

* A user cannot have duplicate assignments within the same Yearly Company.

---

## AdvisorAssignment

* A Sponsorship Member can have only one Advisor per Year.
* Year + memberId must be unique.
* A YearlyCompany must never store a direct reference to an Advisor.

---

## SponsorshipContract

* Every contract belongs to one Yearly Company.
* A Yearly Company has at most one contract — `yearlyCompanyId` is unique on `SponsorshipContract`.
* `assigneeId` is set on the contract, not on individual Contract Menus.

---

## SponsorshipMenu

* Every Sponsorship Menu belongs to one Year.
* Name must be unique within the same Year.

---

## ContractMenu

* Every Contract Menu belongs to one Sponsorship Contract.
* Every Contract Menu references exactly one Sponsorship Menu.
* `sponsorshipMenuId` must belong to the same Year as the contract's Yearly Company.

---

## Payment

* Every payment belongs to one contract.
* A Sponsorship Contract has at most one Payment — `contractId` is unique on `Payment` (no split/installment payments).

---

# Business Invariants

The following rules must always be satisfied.

* A Company never belongs directly to a Year.
* Sponsorship progress belongs to a Yearly Company.
* Contract Menus always belong to a Sponsorship Contract.
* Every Contract Menu references exactly one Sponsorship Menu.
* Sponsorship Menus are master data and never belong to a specific Company or Contract.
* Payments always belong to a Sponsorship Contract.
* Activity logs cannot be updated.
* MySQL is the only authoritative data source.
* An Advisor is assigned to Sponsorship Members, never directly to a Yearly Company.
* An assignee is set per Sponsorship Contract, never per Contract Menu.

---

# Future Extensions

The model is designed to support future features without changing the core structure.

Possible extensions include:

* Printing schedules
* Email synchronization
* Accounting integration
* Automatic address/postal code validation on Company entry (the legacy spreadsheet performed this with a formula-based AI function; not a stored field, and not yet implemented in AdAdd)

These extensions should reference existing entities rather than introducing duplicate business concepts.
