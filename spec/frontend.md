# Frontend Design

## Purpose

This document defines the frontend structure and user interface design of AdAdd.

The frontend provides interfaces for sponsorship management based on user roles and business responsibilities.

The frontend design follows these principles:

* Display information according to user responsibilities.
* Do not expose unauthorized operations.
* Reflect business workflows rather than database structures.
* Keep complex sponsorship operations understandable for committee members.

---

# Frontend Architecture

## Application Structure

```text
Frontend

├── Authentication
│
├── Dashboard
│
├── Company Management
│
├── Sponsorship Management
│
├── Sponsorship Menu Management
│
├── Advertisement / Production Management
│
├── Finance Management
│
└── System Administration
```

---

# User Roles

## General Member

Purpose:

* View assigned tasks
* Update own sponsorship progress

Accessible features:

* Assigned company list
* Company detail
* Sponsorship progress update
* Contract information view
* Contract menu production update

---

## Sponsorship Member

Purpose:

* Manage assigned companies

Accessible features:

* Assigned company dashboard
* Company communication history
* Contract management
* Contract menu progress

---

## Advisor

Purpose:

* Support and monitor sponsorship members

Accessible features:

* Assigned member list
* Member progress dashboard
* Member's assigned companies
* Sponsorship progress overview

Restrictions:

* Cannot modify member assignments
* Cannot modify finance information

---

## Company Management Department

Purpose:

* Manage sponsorship operation

Accessible features:

* Company master management
* Yearly company creation
* Company phase management
* Sponsorship member assignment
* Advisor assignment
* Overall progress monitoring

---

## Sponsorship Menu Management Team

Purpose:

* Manage sponsorship products and production processes

Accessible features:

* Sponsorship menu management
* Contract menu monitoring
* Production status management
* Drive information management

---

## Finance Department

Purpose:

* Manage sponsorship payments

Accessible features:

* Payment status management
* Income confirmation
* Payment history

Restrictions:

* Cannot modify sponsorship progress
* Cannot modify contracts

---

## Administrator

Purpose:

* Manage system configuration

Accessible features:

* User management
* Role management
* System settings

---

# Screen Structure

## Dashboard

## Purpose

Provide users with an overview of their responsibilities.

---

### General Member Dashboard

Display:

* Assigned companies
* Pending tasks
* Upcoming deadlines

---

### Advisor Dashboard

Display:

* Managed members
* Member progress
* Companies requiring attention

Example:

```text
Advisor: 山田

Members

├── 田中
│    ├── Company A
│    └── Company B
│
└── 鈴木
     └── Company C
```

---

### Department Dashboard

Display:

* Department progress
* Overall sponsorship status
* Outstanding tasks

---

# Company Management

## Company List

Purpose:

Manage company master data.

Display:

| Information                             |
| ---------------------------------------- |
| Company name                            |
| Contact person (company-side)           |
| Contact email or inquiry form            |
| Phone number / address                  |
| First sponsorship year                  |

Actions:

* Create company
* Edit company
* View sponsorship history (past Yearly Companies)

---

# Yearly Company Management

## Yearly Company List

Purpose:

Manage companies participating in the current festival year.

Display:

| Information      |
| ---------------- |
| Company name     |
| Company status (Continuing/New/Dormant) |
| Sponsorship phase (Phase1/2/3) |
| Assigned member  |
| Progress         |

Filters:

* Company status
* Sponsorship phase
* Assigned member
* Contract status

---

## Yearly Company Detail

Main operation screen.

Display:

```text
Company Information

↓


Assignment

協賛実働メンバー
協賛アドバイザー


↓

Contract


↓

Contract Menu


↓

Progress History
```

---

# Sponsorship Progress Management

## Progress Timeline

Purpose:

Visualize sponsorship status.

Status:

```text
未連絡
 ↓
資料送付
 ↓
協賛確定
 ↓
請求書送付
 ↓
協賛金入金
 ↓
領収書送付
```

Display:

* Current status
* History
* Updated user
* Updated date

---

# Contract Management

## Contract Detail

Display:

```text
Company

Contract

├── Menu A
│     Quantity
│     Price
│     Production Status
│
├── Menu B
│     Quantity
│     Price
│     Production Status
│
└── Total Amount
```

---

# Contract Menu Management

## Contract Menu List

Purpose:

Manage each contracted sponsorship item.

Display:

| Information     |
| ---------------- |
| Menu name       |
| Quantity        |
| Price           |
| Production type |
| Status          |
| Drive URL       |

---

## Contract Menu Detail

Display depends on production type.

---

### Company Production

Display:

* Company submission status
* Submitted data
* Confirmation status

---

### Committee Production

Display:

* Assigned production department
* Request status
* Completion status

---

# Sponsorship Menu Management

## Menu Master List

Purpose:

Manage yearly sponsorship offerings.

Display:

| Information         |
| -------------------- |
| Menu name           |
| Price               |
| Submission required |
| Active status       |

---

## Menu Creation

Input:

* Name
* Default price
* Required submission
* Description

---

# Finance Management

## Payment List

Purpose:

Manage received sponsorship payments.

Display:

| Information     |
| ---------------- |
| Company         |
| Contract amount |
| Payment status  |
| Payment date    |

Actions:

* Confirm payment
* Update status

---

# External Data Integration

## Google Forms Import Screen

Purpose:

Import sponsorship applications.

Flow:

```text
Google Forms

↓

Import Preview

↓

Confirm

↓

Create Contract
```

---

## CSV Import / Export

Purpose:

Support existing spreadsheet operations.

Supported:

* Company data import
* Company data export
* Progress export

---

# Navigation Structure

```text
Sidebar

├── Dashboard
│
├── Companies
│
├── Yearly Companies
│
├── Sponsorship Contracts
│
├── Sponsorship Menus
│
├── Finance
│
├── Reports
│
└── Settings
```

---

# UI Design Principles

## Principle 1: Show Required Information Only

Users should not see unnecessary information.

Example:

Finance users do not need sales communication details.

---

## Principle 2: Use Workflow-Based UI

Avoid displaying raw database entities.

Example:

Instead of:

```text
ContractMenu.status = WAITING
```

Display:

```text
広告データ提出待ち
```

---

## Principle 3: Preserve History

Important actions should be visible through timelines.

Examples:

* Progress changes
* Assignment changes
* Payment updates

---

## Principle 4: Editing Should Feel Like a Spreadsheet, Not a Form

AdAdd replaces a spreadsheet-based workflow. If editing business data in AdAdd is harder than editing the spreadsheet was, people will keep using the spreadsheet instead.

* Prefer inline, cell-level editing over full-page forms with a separate save step, for list/table screens (e.g. Yearly Company list).
* New rows may be created mostly blank and filled in over time. Only validate the field(s) that would otherwise break data integrity (e.g. Company name uniqueness) — do not require an entire row to be complete before it can be saved.
* Bulk initial data entry should go through Google Sheets Import (see `spec/api.md` → Google Sheets Import), not one-by-one UI entry.
* Keep permission restrictions limited to what business rules actually require (see `spec/business.md` Organization, `spec/api.md` Authorization Matrix). Do not add new restrictions beyond documented business rules for the sake of caution.
* Where a user can view a field but not edit it, show it (e.g. read-only/greyed out) rather than hiding it.
* Rely on Activity Log (append-only, see `spec/domain.md` Rule 8) as the safety net for mistakes, instead of confirmation dialogs or overly cautious permission gates that slow down everyday editing.

---

# Future Extensions

Potential improvements:

* Mobile-friendly sponsorship member interface
* Notification system
* Analytics dashboard
* Calendar integration
