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

## Login

Purpose:

Authenticate the user via Google, and gate every other screen behind a valid session.

Flow (BFF pattern — the Next.js frontend and Go API run on separate domains in production, so the frontend, not the browser, holds the session):

1. Unauthenticated visitor is redirected to `/login`, which starts Google's OAuth Authorization Code flow. There is no Google Workspace / hosted-domain restriction (see `spec/api.md#Login`) — committee members sign in with ordinary personal Google accounts, so this step only proves the visitor controls that email address, nothing more.
2. Google redirects back to a Next.js route handler, which exchanges the code for a Google `id_token` server-side and posts it to `POST /auth/google` (`spec/api.md#Login`).
3. On success, Next.js stores the returned AdAdd JWT as an httpOnly, Secure cookie on its own origin — the browser never has direct access to the raw token. Next.js's server-side code (Route Handlers / Server Actions) attaches it as `Authorization: Bearer` when calling the Go API on the user's behalf; the browser never calls the Go API directly for authenticated requests.
4. On failure (email not pre-registered, per `spec/model.md` → Business Invariants), show "このメールアドレスは登録されていません。管理者に連絡してください" and do not create a session.

Navigation/action visibility is driven by the roles returned in the login response (`spec/api.md#Login` → `roles`) — see Navigation Structure below.

In local development, the `X-User-ID` / `X-User-Roles` dev headers (`DEV_AUTH_ENABLED=true`) bypass this flow entirely — see `spec/api.md#Authentication`.

---

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

### Ad Material Progress (Sponsorship Menu Management Department)

Purpose:

Track Contract Menu production/submission status across every Sponsorship
Menu for the active Year, and surface which Sponsorship Members to follow
up with (UC-07/UC-08).

Display:

* Status summary — count of Contract Menus per `ContractMenuStatus`,
  across all Sponsorship Menus.
* Per-menu breakdown — one row per Sponsorship Menu (master data for the
  active Year, spec/model.md#SponsorshipMenu), with a count per
  `ContractMenuStatus` and a submitted/total ratio. Sorted by submitted
  ratio ascending (menus needing the most attention first). Each non-zero
  status count links to Contract Menu List (see Contract Menu Management
  below), pre-filtered to that Sponsorship Menu + `ContractMenuStatus`.
* Follow-up list — every Company with at least one Contract Menu not yet
  `SUBMITTED`, grouped by the assigned Sponsorship Member
  (`YearlyCompany.assignedMemberId`/`assignedMemberName`, see Company
  Assignment API). A Company with multiple pending items appears once,
  listing each. Companies with no assigned Member are grouped separately,
  last.
  By default, scoped to the signed-in User: their own assigned Companies,
  plus — for a Sponsorship Advisor — every Company assigned to a Member
  they supervise (`AdvisorAssignment`; an Advisor is never assigned to a
  Company directly, only indirectly through a supervised Member — see
  spec/domain.md Rule 9). A "自分の担当のみ / 全件" toggle switches to the
  unscoped view showing every Member's group; the default is the scoped
  view only if the signed-in User has a stake (an assignment, or a
  supervised Member) in the active Year, otherwise the unscoped view.

Data source: `GET /years/{yearId}/contract-menus` (see spec/api.md)
joined client-side with `GET /years/{yearId}/companies` on
`yearlyCompanyId` for the assigned Member, and with
`GET /advisor-assignments?yearId={yearId}` for the signed-in User's
supervised Members — no additional backend endpoint required. The
signed-in User's identity comes from the dev-stub auth header
(`X-User-ID`, see apps/web/src/lib/api/client.ts) pending real
authentication.

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
* Advisor (FR-010; matches if the assigned member has the selected Advisor among their `AdvisorAssignment` rows for the active Year — a member may have more than one)
* Sponsorship Progress (FR-010)
* Contract status (not yet implemented)

The Assigned Member column/edit surfaces and edits the Yearly Company's single assignee (inline, cell-level, per Principle 4). `CompanyAssignment` is domain-modeled as 0..1 per Yearly Company (`spec/model.md#CompanyAssignment`) — a Yearly Company has at most one assigned member, so this is the actual cardinality, not a UI simplification.

Company status, Sponsorship phase, and Progress are each editable inline (cell-level, per Principle 4) directly from this list, the same as on Yearly Company Detail — there is no separate "actions" column, since the only other per-row action (viewing/creating the Contract) is already reachable via the Company name link.

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

* No contract yet — a "契約を作成" action expands an inline creation form (contract date, remarks, one or more Contract Menu line items) in place; no page navigation. Creating a contract also sets `YearlyCompany.progress` to Confirmed. A `Payment` record is created separately after Contract Menu が作成され `totalAmount > 0` の場合（`POST /contracts/{contractId}/payment`）、goods-sponsorship-only contracts (`totalAmount = 0`) get no Payment record.
* A contract exists — the full Contract Menu table (quantity/price/production status, same as Contract Menu Management below), invoice generation (FR-015), and payment status (read-only here — status changes happen on Finance) are all shown inline. Each row also has a "削除" action (`DELETE /contract-menus/{id}`, spec/api.md#Delete Contract Menu) that removes the line item and recalculates the Contract's `totalAmount`; this is the add/remove point for a Contract's Contract Menus — Contract Menu List (below) is a cross-contract monitoring view, not where items get added or removed.

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

Scoped to the active Year (`GET /years/{yearId}/contract-menus`, see
spec/api.md#List Contract Menus Across a Year).

Filters:

* Company name (search, substring match)
* Sponsorship Menu
* Status
* Production type

Sponsorship Menu and Status accept an initial value from the URL
(`?menuId=&status=`), so the per-menu status breakdown on Ad Material
Progress (see above) can link directly into this list pre-filtered to a
given Sponsorship Menu + `ContractMenuStatus` cell.

Status is directly editable to any `ContractMenuStatus`, including
`SUBMITTED` (`PATCH /contract-menus/{id}/status`). Production type has no
update endpoint — it's set once at creation (`POST
/contracts/{contractId}/menus`) — so it's read-only here. Registering a
Drive URL always finalizes the item: `PATCH /contract-menus/{id}/production`
sets `status` to `SUBMITTED` as part of the same call (spec/api.md#Upload
Production Information), so saving a Drive URL here updates both fields
together.

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

# System Administration

## User List

Purpose:

Manage system users (UC-12). Actor: System Administrator.

Display, one always-editable row per user (Principle 4):

| Information  |
| ------------ |
| Student ID   |
| Name         |
| Email        |
| Slack ID     |
| Active       |
| Roles        |

Actions:

* Add user (new row, mostly blank) — this is also how a User is pre-registered before they can ever log in (`spec/model.md` → Business Invariants: no self-service signup).
* Edit any field inline
* Disable / re-enable (Active toggle)
* Roles cell: chips, one per current `UserRole` grant (`spec/model.md#UserRole`), matching the Advisor Assignment pattern below — a "+" opens a dropdown of the 7 fixed Roles (`GET /roles`, `spec/api.md#List Roles`) not already granted; clicking a chip's "×" revokes that Role (`DELETE /users/{userId}/roles/{roleId}`). A User may hold zero Roles (e.g. immediately after being added, before an Administrator grants one) — they can still authenticate but see none of the role-gated navigation (Navigation Structure below).

---

## Advisor Assignment

Purpose:

Assign one or more Sponsorship Advisors to each Sponsorship Member (UC-03, FR-013). A Member may have multiple Advisors at once. Actor: Company Management Team.

Display, one row per User (there is no `Role` yet, so any User may act as a Sponsorship Member or an Advisor — see User List above):

| Information                          |
| ------------------------------------- |
| Sponsorship Member (name)            |
| Advisors (chips, one per assignment) |

Actions:

* The Advisors cell shows one chip per current `AdvisorAssignment`, scoped to the active Year (`AdvisorAssignment.yearId`).
* A "+" control on the cell opens a dropdown to add another Advisor (Principle 4) — a User cannot be selected as their own Advisor, and an Advisor already present as a chip is excluded from the dropdown.
* Clicking a chip's "×" removes that single advisor assignment (`DELETE /advisor-assignments/{id}`) without affecting the Member's other Advisors.

Below the table, a read-only summary groups members by their current Advisor(s) — a member with multiple Advisors appears under each — covering FR-013's "view the members supervised by a given Advisor." Viewing the companies an Advisor's members handle (FR-013's 4th bullet) is not built here — that belongs to a future Advisor Dashboard, out of scope for now (see Dashboard → Department view decision).

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
├── Users
│
├── Advisor Assignments
│
└── Settings
```

Each item is shown only to the Roles that can use it (`spec/frontend.md` → User Roles, `spec/domain.md#Role`) — e.g. Finance is hidden unless the signed-in User holds the Finance Department Role, Users/Advisor Assignments/Settings unless they hold Administrator. Administrator sees everything (superuser, `spec/model.md#UserRole`). Today every item is unconditionally rendered regardless of Role — this gating does not exist yet (see Issue tracking for Login/roles).

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
