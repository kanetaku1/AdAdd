# Domain Model

## Purpose

This document defines the business domain of AdAdd.

The domain model represents business concepts rather than database tables or API resources.

All implementations should follow this model.

---

# Domain Overview

The sponsorship business is centered around the **Yearly Company**.

A Company exists independently of festival years.

Each festival year creates a Yearly Company that represents the relationship between the festival and that company for a specific year.

Everything else belongs to the Yearly Company.

```text
Year
    │
    ├──── Sponsorship Menu (master)
    │
    └──── Yearly Company
              │
              ├──── Sponsorship Contract
              │          │
              │          ├──── Contract Menu ──→ references Sponsorship Menu
              │          └──── Payment
              │
              └──── Activity Log
```

A Sponsorship Menu is the yearly master definition of what can be sponsored (e.g. Pamphlet advertisement, Company booth, Website listing). A Contract Menu is the concrete instance a company actually contracted for, carrying its own progress, assignee, and Drive folder.

---

# Aggregates

## Year

Represents one festival cycle.

### Responsibilities

* Manage festival years
* Archive yearly data
* Separate yearly business information

### Relationships

```
Year
 ├── YearlyCompany (0..*)
 └── SponsorshipMenu (0..*)
```

---

## Sponsorship Menu

Represents one type of sponsorship benefit offered during a festival year.

This is master data. It defines what can be sponsored, not what a specific company sponsored.

### Responsibilities

* Menu category and name
* Default price
* Whether submission/production is required
* Whether the menu is currently offered

### Relationships

```
Year
 └── SponsorshipMenu (0..*)
      └── ContractMenu (0..*)
```

---

## Company

Represents a company.

A Company is permanent.

It does not belong to a specific festival year.

### Responsibilities

* Company profile
* Contact information
* Company history

### Relationships

```
Company
 └── YearlyCompany (0..*)
```

---

## Yearly Company (Aggregate Root)

This is the core aggregate of AdAdd.

It represents a company's sponsorship activity during one festival year.

Every business process starts from a Yearly Company.

### Responsibilities

* Sponsorship progress
* Assigned members
* Company status (continuing / new / dormant)
* Sponsorship phase (outreach priority ranking for the current Year)
* Activity history
* Sponsorship contracts

Advisors are not assigned to a Yearly Company directly. An Advisor supervises Sponsorship Members, and monitors company progress indirectly through the members assigned to that company.

### Relationships

```
YearlyCompany

├── Year
├── Company
├── Assignment
├── SponsorshipContract
└── ActivityLog
```

---

## Sponsorship Contract

Represents one sponsorship agreement.

A Yearly Company may have multiple contracts.

### Responsibilities

* Contract information
* Sponsorship contents
* Contract status

### Relationships

```
YearlyCompany
      │
      └── SponsorshipContract
```

---

## Contract Menu

Represents one Sponsorship Menu that a company has actually contracted for, as part of a Sponsorship Contract.

A Contract Menu references exactly one Sponsorship Menu. A contract may contain multiple Contract Menus.

The management content differs depending on the referenced Sponsorship Menu category (e.g. submission management for advertisements, booth information management for booths, submission management followed by listing confirmation for website listings such as a homepage banner).

### Responsibilities

* Production method (when submission is required)
* Progress status
* Google Drive folder
* Assignee

### Relationships

```
SponsorshipContract
        │
        └── ContractMenu ──→ SponsorshipMenu
```

---

## Payment

Represents payment information for a contract.

### Responsibilities

* Amount
* Payment status
* Payment date
* Confirmation

### Relationships

```
SponsorshipContract
        │
        └── Payment
```

---

## Activity Log

Represents business history.

Every important action should generate an Activity Log.

History should never be modified.

### Examples

* Member assigned
* Materials sent
* Contract confirmed
* Payment confirmed

---

# Supporting Entities

## User

Represents a system user.

A user may have multiple roles.

---

## Role

Represents permissions.

Examples include:

* Sponsorship Member
* Advisor
* Finance Department
* Sponsorship Menu Management

---

## Advisor Assignment

Represents the supervision relationship between a Sponsorship Advisor and a Sponsorship Member.

An Advisor is assigned to Members, not to Yearly Companies or Companies.

### Responsibilities

* Link an Advisor to a Sponsorship Member
* Scope the assignment to a festival Year

### Relationships

```
User (Advisor)
      │
      └── AdvisorAssignment
                │
                └── User (Sponsorship Member)
```

---

# Value Objects

The following concepts are immutable values.

## Company Status

Represents the company's relationship history with the festival. Informed by past Company/YearlyCompany data.

Examples:

* Continuing
* New
* Dormant

---

## Sponsorship Phase

Represents the outreach priority ranking assigned to a Yearly Company by the Company Management Team during the Year preparation period (see UC-02). Independent of Company Status — a Continuing company and a New company can both be assigned any Sponsorship Phase.

Examples:

* Phase 1 (highest priority)
* Phase 2
* Phase 3

---

## Sponsorship Progress

Typical values:

* Not Contacted
* Materials Sent
* Sponsorship Confirmed
* Invoice Sent
* Payment Received
* Receipt Sent
* Declined
* Pending

---

## Contract Menu Production Type

Applies only when the referenced Sponsorship Menu requires submission. The company chooses between these when submitting the Google Forms application, and the choice determines what the company submits — a finished product, or raw material for the committee to build from.

* Company Production — the company submits a finished, ready-to-use product (完成品).
* Internal Production — the company submits raw material (素材, e.g. logo, text/copy), and the Sponsorship Menu Management Team has another department produce the finished product from it.

---

## Contract Menu Status

Examples:

* Waiting
* Requested
* In Progress
* Completed

---

## Payment Status

Examples:

* Waiting
* Confirmed

---

# Relationships

```
Year
    │
    ├──── SponsorshipMenu
    │
    └──── YearlyCompany
               │
               ├──── Company
               ├──── Assignment
               ├──── ActivityLog
               └──── SponsorshipContract
                            │
                            ├──── ContractMenu ──→ SponsorshipMenu
                            └──── Payment

User (Advisor)
    │
    └──── AdvisorAssignment
               │
               └──── User (Sponsorship Member)
```

The Advisor–Member relationship is independent of the YearlyCompany aggregate. A Yearly Company never references an Advisor directly.

---

# Lifecycle

## Company

```
Create

↓

Update

↓

Reuse every year
```

Companies are never recreated every year.

---

## Yearly Company

```
Create Year

↓

Assign Members

↓

Manage Sponsorship

↓

Archive
```

A new Yearly Company is created every festival year.

---

## Sponsorship Contract

```
Draft

↓

Confirmed

↓

Completed
```

A contract may also be created directly when an agreement is made outside Google Forms.

---

## Contract Menu

```
Created

↓

Requested

↓

Producing

↓

Completed

↓

Submitted
```

For menus that do not require submission (e.g. company booth), the lifecycle may skip directly from Created to Completed.

Website listing (e.g. a homepage banner) requires submission — the company provides banner artwork/logo data — and follows the full submission lifecycle, the same as other advertisement-type menus.

---

## Payment

```
Waiting

↓

Confirmed
```

Confirmation is performed manually by the Finance Department.

---

# Domain Rules

## Rule 1

A Company exists independently of festival years.

---

## Rule 2

A Yearly Company belongs to exactly one Year.

---

## Rule 3

A Yearly Company references exactly one Company.

---

## Rule 4

A Yearly Company may exist without any Sponsorship Contract.

---

## Rule 5

A Sponsorship Contract belongs to exactly one Yearly Company.

---

## Rule 6

A Sponsorship Contract may contain multiple Contract Menus.

---

## Rule 7

Every Payment belongs to exactly one Sponsorship Contract.

---

## Rule 8

Activity Logs are append-only.

Existing history must never be modified or deleted.

---

## Rule 9

A Sponsorship Advisor is assigned to Sponsorship Members, not to Yearly Companies or Companies.

A Yearly Company must never store a direct reference to an Advisor.

---

## Rule 10

A Sponsorship Menu belongs to exactly one Year and is master data.

A Sponsorship Menu never belongs to a specific Company or Contract.

---

## Rule 11

A Contract Menu belongs to exactly one Sponsorship Contract and references exactly one Sponsorship Menu.

A Contract Menu must never duplicate attributes already defined on its Sponsorship Menu (e.g. category, default price).

---

# Aggregate Boundaries

The aggregate roots are:

* Year
* Company
* YearlyCompany
* SponsorshipMenu
* User

Everything else belongs to one of these aggregates.

Business operations should begin from an Aggregate Root whenever possible.

---

# Domain Principles

The Yearly Company is the center of the domain.

Business logic should be implemented around business concepts rather than database tables.

The domain model should remain stable even if the database schema or frontend implementation changes.
