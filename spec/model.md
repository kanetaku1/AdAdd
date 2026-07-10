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

| Name            | Type     |
| --------------- | -------- |
| id              | UUID     |
| companyName     | string   |
| companyNameKana | string   |
| postalCode      | string   |
| address         | string   |
| phoneNumber     | string   |
| website         | string   |
| memo            | text     |
| createdAt       | datetime |
| updatedAt       | datetime |

A Company exists permanently.

---

## YearlyCompany

Represents one company's activity during one festival year.

This is the central model of AdAdd.

### Attributes

| Name      | Type     |
| --------- | -------- |
| id        | UUID     |
| yearId    | UUID     |
| companyId | UUID     |
| phase     | enum     |
| priority  | enum     |
| progress  | enum     |
| notes     | text     |
| createdAt | datetime |
| updatedAt | datetime |

YearlyCompany does not reference an Advisor. Advisors are assigned to Sponsorship Members via `AdvisorAssignment`.

---

## SponsorshipContract

Represents one sponsorship agreement.

### Attributes

| Name            | Type     |
| --------------- | -------- |
| id              | UUID     |
| yearlyCompanyId | UUID     |
| contractNumber  | string   |
| contractDate    | date     |
| confirmedAt     | datetime |
| totalAmount     | decimal  |
| assigneeId      | UUID     |
| remarks         | text     |

The assignee is scoped to the contract, not to individual Contract Menus. Every Contract Menu under a contract shares the same assignee.

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
| category           | enum    |
| defaultPrice       | decimal |
| requiresSubmission | boolean |
| isActive           | boolean |

---

## ContractMenu

Represents one Sponsorship Menu that a company has actually contracted for.

### Attributes

| Name              | Type     |
| ----------------- | -------- |
| id                | UUID     |
| contractId        | UUID     |
| sponsorshipMenuId | UUID     |
| productionType    | enum     |
| status            | enum     |
| driveFolderId     | string   |
| driveUrl          | string   |
| submittedAt       | datetime |
| remarks           | text     |

ContractMenu does not have its own assignee. The assignee belongs to the parent `SponsorshipContract`.

---

## Payment

Represents payment information.

### Attributes

| Name        | Type     |
| ----------- | -------- |
| id          | UUID     |
| contractId  | UUID     |
| amount      | decimal  |
| status      | enum     |
| confirmedAt | datetime |
| confirmedBy | UUID     |

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
| isActive  | boolean |

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

## CompanyPhase

* Continuing
* New
* Dormant
* Priority

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

## SponsorshipMenuCategory

* Advertisement
* Booth
* WebListing

---

## ContractMenuProductionType

Applies only when the referenced Sponsorship Menu has `requiresSubmission = true`.

* Company
* Internal

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

1 ----- *

ContractMenu

1 ----- *

Payment
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

These extensions should reference existing entities rather than introducing duplicate business concepts.
