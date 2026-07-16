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
└── Settings
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

Filters:

* Company name (search, substring match)

Actions:

* Create company
* Edit company
* View sponsorship history (past Yearly Companies)
* Register the company into the active Year as a Yearly Company (per row, only shown when it isn't already registered for that Year) — the individual registration path noted in `spec/usecase.md` UC-01 Notes.

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

* Company name (search, substring match)
* Company status
* Sponsorship phase
* Assigned member (FR-010)
* Advisor (FR-010; derived from the assigned member's `AdvisorAssignment` for the active Year)
* Sponsorship Progress (FR-010)
* Contract status (not yet implemented)

The Assigned Member column/edit currently surfaces and edits **one** primary assignee per Yearly Company (inline, cell-level, per Principle 4), even though `Assignment` is domain-modeled as 1:* (`spec/model.md#Assignment` — a Yearly Company may have multiple assigned members). Multi-assignee UI is deferred to a later iteration; this is a stated frontend scope simplification, not a change to the domain model.

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

Contract and Contract Menu are both shown directly on this screen (there is no separate Contract Detail route — `YearlyCompany`:`SponsorshipContract` is 1:1, per `spec/model.md`, so a dedicated detail page for the contract added nothing this screen couldn't already hold):

* No contract yet — a "契約を作成" action expands an inline creation form (contract date, remarks, one or more Contract Menu line items) in place; no page navigation. Creating a contract also sets `YearlyCompany.progress` to Confirmed, and creates a `Payment` record (spec/model.md#Payment) when `totalAmount > 0` — goods-sponsorship-only contracts (`totalAmount = 0`) get no Payment record.
* A contract exists — the full Contract Menu table (quantity/price/production status, same as Contract Menu Management below), invoice generation (FR-015), and payment status (read-only here — status changes happen on Finance) are all shown inline.

Progress History currently shows only the live `YearlyCompany.progress` badge (editable). A full change-history timeline is UC-14 (Activity Log) — not built yet.

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

Filters:

* Company name (search, substring match)
* Sponsorship Menu
* Status
* Production type

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

# Year Management

## Year List

Purpose:

Create and switch between festival years (UC-01). Actor: Company Management Team.

Display:

| Information         |
| -------------------- |
| Name (e.g. 2026)     |
| Start date / End date |
| Active (運用中)      |

Actions:

* Create a new Year — copies every Company forward as a Yearly Company for the new Year (`companyStatus` auto-computed, see `spec/domain.md` → Company Status), and makes the new Year active in place of whichever Year was active before.

Only one Year is active at a time. `/yearly-companies` and `/sponsorship-menus` scope to the active Year.

---

# Settings

Actor: Administrator (see User Roles → Administrator).

Groups the system-administration screens behind one sidebar entry (`/settings`), each as its own tab/sub-route rather than a separate top-level nav item:

* User List (includes Role assignment)
* Advisor Assignment

Years is not part of Settings — switching the active Year is a frequent, business-critical operation (it scopes `/yearly-companies` and `/sponsorship-menus`), not an administrative configuration task, so it keeps its own top-level nav entry (see Year Management).

## User List

Purpose:

Manage system users (UC-12). Actor: System Administrator.

**Exception to Principle 4:** Student ID, Name, Email, Slack ID, and Role(s) are not edited inline. Unlike business/workflow data (Yearly Company, Contract Menu, ...), these fields change rarely once a user is set up, so exposing them as always-editable cells only adds risk of an accidental edit with no everyday editing benefit. Editing goes through a dialog instead — same reasoning, and same pattern, as Company List's "Edit company" action.

Display, one row per user:

| Information  |
| ------------ |
| Student ID   |
| Name         |
| Email        |
| Slack ID     |
| Role(s)      |
| Active (inline toggle) |

Actions:

* Add user — opens the edit dialog blank
* Edit user — opens the edit dialog pre-filled with Student ID, Name, Email, Slack ID, and Role(s) (multi-select; `User *─* Role` is many-to-many, `spec/database.md#Role` — options are the fixed example set: GeneralMember, CompanyManagement, MenuManagement, Finance, Administrator)
* Disable / re-enable (Active toggle, stays inline — this is a frequent, deliberate access-control action, not a profile edit)

This covers all of UC-12: user creation, role assignment, listing, and activation/deactivation.

---

## Advisor Assignment

Purpose:

Assign a Sponsorship Advisor to each Sponsorship Member (UC-03, FR-013). Actor: Company Management Team.

Display, one row per User (the Advisor dropdown is not restricted by Role — any User may act as a Sponsorship Member or an Advisor — see User List above):

| Information                |
| --------------------------- |
| Sponsorship Member (name)  |
| Advisor (inline-editable)  |

Actions:

* Click the Advisor cell to reassign it via a dropdown (Principle 4), scoped to the active Year (`AdvisorAssignment.yearId`) — a User cannot be selected as their own Advisor.
* Selecting the empty option ("未設定") removes the assignment.

Below the table, a read-only summary groups members by their current Advisor, covering FR-013's "view the members supervised by a given Advisor." Viewing the companies an Advisor's members handle (FR-013's 4th bullet) is not built here — that belongs to a future Advisor Dashboard, out of scope for now (see Dashboard → Department view decision).

Assignments do not carry over when a new Year is created — reassignment is a fresh per-Year action, same as the Yearly Company assigned-member picker.

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
├── Sponsorship Menus
│
├── Finance
│
├── Reports
│
├── Years
│
└── Settings
     │
     ├── Users (includes Role assignment)
     │
     └── Advisor Assignments
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
