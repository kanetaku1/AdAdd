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

The Role set was reduced from 7 to 4 canonical Roles (plus a no-Role
baseline) — Company Management Department and Sponsorship Menu Management
Team were removed as separate Roles; their responsibilities (Company/Year
master data, Sponsorship Menu management) moved to Sponsorship Member
(Year creation stays Administrator-only). General Member was removed too —
holding no Role at all is now the baseline, view-only state.

## (No Role)

Purpose:

* View-only baseline for any authenticated User before an Administrator
  grants a Role

Accessible features:

* Assigned company list, Company detail (view only)
* Contract information view
* Sponsorship progress view

Restrictions:

* Cannot update sponsorship progress, contracts, contract menus, or any
  master data — these require the Sponsorship Member Role

---

## Sponsorship Member

Purpose:

* Manage assigned companies and day-to-day sponsorship operations

Accessible features:

* Assigned company dashboard
* Company communication history
* Company master management (create/edit Company)
* Yearly company creation and phase management
* Contract management
* Contract menu progress and production update
* Sponsorship menu management
* Payment record creation

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

## Finance Department

Purpose:

* Manage sponsorship payments

Accessible features:

* Payment record creation
* Payment status management
* Income confirmation
* Payment history

Restrictions:

* Cannot modify sponsorship progress
* Cannot modify contracts

---

## Administrator

Purpose:

* Manage system configuration and hold every permission as a superuser

Accessible features:

* Every Sponsorship Member / Advisor / Finance Department feature
* Year creation
* Sponsorship member assignment
* Advisor assignment
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

### Sponsorship Member Dashboard

Display:

* Assigned companies
* 要対応 (needs attention) — `YearlyCompany.progress` for the signed-in Member's own assigned companies (`CompanyAssignment`) only. Same scoping as Ad Material Progress's default follow-up view (`spec/frontend.md#Ad Material Progress`) — no separate query.

---

### Advisor Dashboard

Display:

* Managed members
* 要対応 (needs attention) — progress for the Advisor's own assigned companies (if any) plus every company assigned to a Member they supervise (`AdvisorAssignment`, same scoped join as Ad Material Progress above).

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

### Administrator Dashboard

Display:

* Overall sponsorship status across every Sponsorship Member
* Outstanding tasks
* System-wide progress

---

### Ad Material Progress

Purpose:

Track Contract Menu production/submission status across every Sponsorship
Menu for the active Year, and surface which Sponsorship Members to follow
up with (UC-07/UC-08). Not restricted to a specific Role — any Sponsorship
Member or Advisor can use it to track their own or their supervised
Members' follow-ups (main users in practice: Sponsorship Members doing
ad-material management, and Advisors).

Display:

* Status summary — count of Contract Menus per `ContractMenuStatus`,
  across all Sponsorship Menus.
* Per-menu breakdown — one row per Sponsorship Menu (master data for the
  active Year, spec/model.md#SponsorshipMenu), with a count per
  `ContractMenuStatus` and a submitted/total ratio. Sorted by submitted
  ratio ascending (menus needing the most attention first). Each non-zero
  status count links to Contract Menu List (see Contract Menu Management
  below), pre-filtered to that Sponsorship Menu + `ContractMenuStatus`.
  For a menu with `maxQuantity` set (`spec/model.md#SponsorshipMenu`),
  additionally show contracted-quantity-so-far vs. `maxQuantity` (fill
  ratio), so approaching-capacity menus are visible before they're full.
  A Slack alert when a capped menu nears capacity is a Future Extension
  (see below), not implemented now.
* Follow-up list — every Company with at least one Contract Menu not yet
  `SUBMITTED`, along with that Contract Menu's `ContractMenuStatus`,
  grouped by the assigned Sponsorship Member
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

* Company name (FR-010) — typo-tolerant / similar-term search (not only exact substring), so users can find targets that plain browser `Ctrl+F` misses
* Company status
* Sponsorship phase
* Assigned member (FR-010)
* Advisor (FR-010; matches if the assigned member has the selected Advisor among their `AdvisorAssignment` rows for the active Year — a member may have more than one)
* Sponsorship Progress (FR-010)
* Contract existence (FR-010; has contract / no contract)

Filter UX for operational scale (about 20 committee members, about 500 companies):

* Prioritize exploratory filtering over single-value selectors. Use faceted controls that can narrow candidates quickly (multi-select chips + candidate counts) instead of only opening long dropdown lists.
* Advisor/Member filters should be searchable pickers with ranking by relevance and recent usage, so users can discover targets quickly even when they do not remember the exact display name.
* Company-name filtering should support approximate matching (e.g., notation differences, partial typo, close token) and show matched-highlight snippets to explain why each row matched.
* Keep the list optimized for "filter first, inspect later": filters stay visible while scrolling, and active conditions are always shown as removable chips.

Contract existence is used only as a filter condition; it is not shown as a dedicated column in the table.

The Assigned Member column/edit surfaces and edits the Yearly Company's single assignee (inline, cell-level, per Principle 4). `CompanyAssignment` is domain-modeled as 0..1 per Yearly Company (`spec/model.md#CompanyAssignment`) — a Yearly Company has at most one assigned member, so this is the actual cardinality, not a UI simplification.

Company status, Sponsorship phase, and Progress are each editable inline (cell-level, per Principle 4) directly from this list, the same as on Yearly Company Detail — there is no separate "actions" column, since the only other per-row action (viewing/creating the Contract) is already reachable via the Company name link.

---

## Yearly Company Detail

Main operation screen — the single working surface for a Sponsorship Member handling one company, consolidating everything previously spread across separate screens (company info, assignment, contract, Contract Menus, status history, invoice/receipt generation).

Display order:

```text
Company Information

↓

Assignment (担当 — member + advisor + progress, compact)

↓

Contract Menu (editable)

↓

Contract (payment status + total, invoice/receipt actions)

↓

Activity Log (collapsible)
```

### Company Information

One consolidated block: contact person name, contact (email/phone), address, and `memo`(引継ぎ事項, handover notes — `spec/model.md#Company`).

### Assignment (担当)

Compact — not full sub-sections: assigned Sponsorship Member (`CompanyAssignment`), the same company's Sponsorship Advisor(s) (derived client-side via `AdvisorAssignment` on the assigned member, same join as `spec/frontend.md#Ad Material Progress`), and the current `YearlyCompany.progress` badge, together in one row/strip rather than three stacked sections.

### Contract Menu (editable)

Shown before Contract (production/status work happens more often than contract-level edits). The Contract Menu table is both the creation point (no contract yet — see below) and the ongoing edit point for a Contract's Contract Menus:

* No contract yet — a "契約を作成" action expands an inline creation form (contract date, remarks, one or more Contract Menu line items) in place; no page navigation. Creating a contract also sets `YearlyCompany.progress` to Confirmed. A `Payment` record is created separately once a Contract Menu exists and `totalAmount > 0` (`POST /contracts/{contractId}/payment`); goods-sponsorship-only contracts (`totalAmount = 0`) get no Payment record. Field-level validation errors are highlighted at the specific field, not just a generic banner (see UI Design Principles below).
* A contract exists — each line is editable in place (`isGoodsSponsorship`, quantity, production type, status, Drive submission — `spec/api.md#Update Contract Menu` / `#Update Contract Menu Status` / `#Upload Production Information`). No delete action is exposed here (removal is not a supported UI operation on this screen — `DELETE /contract-menus/{id}` remains Administrator-only, see `spec/api.md#Delete Contract Menu`). Contract Menu List (below, the cross-contract view) is unaffected — it never adds/removes items either.

### Contract

Below Contract Menu. Shows payment status and `totalAmount` only (line-item detail already lives in Contract Menu above) — status changes themselves happen on Finance (read-only here). Invoice/receipt generation actions (FR-015) sit next to this summary.

### Activity Log

Collapsed by default (expand on demand) — degrade to hidden entirely if rendering it costs noticeable load time, since it is a supplementary view, not a primary one. System-generated only (progress / Contract Menu status / Payment status changes — `spec/domain.md#Activity Log`); there is no manual entry action. A handover note that isn't a status change belongs on `Company.memo` instead.

### Open questions (TODO — needs discussion before final field list)

Exact required fields for Company Information / Contract / Contract Menu / Activity Log / company status / ad status blocks above are not yet finalized.

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

Manage each contracted sponsorship item — the primary working screen for Sponsorship Members handling ad-material production/collection (informally "広告管理"; not a separate Role, see `spec/business.md#Roles`) across every company at once.

Producer (production type) and ad status are toggled directly on this list (`spec/api.md#Update Contract Menu Status`). Whether the deliverable is complete is read from Drive URL presence, not a separate flag. (Open consideration, not yet decided: a second Drive link for internal-production working files, separate from the company-facing submission `driveUrl` — see `spec/model.md#ContractMenu`.)

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
* Max quantity (optional — leave blank for unlimited; see `spec/model.md#SponsorshipMenu`)

---

# Finance Management

## Payment List

Purpose:

Manage received sponsorship payments. Main editors: Finance Department (status confirmation) and Sponsorship Member (payment creation, per `spec/api.md#Authorization Matrix` — day-to-day company handling folded into this Role, see `spec/business.md#Roles`).

Display:

| Information             |
| ------------------------ |
| Company (+ companyNameKana, カタカナ表記 — for matching against bank passbook records) |
| Assigned Sponsorship Member |
| Contract amount         |
| Payment status          |
| Payment date            |

Data source: `GET /years/{yearId}/payments` (`spec/api.md`), which already joins `companyNameKana` and `assignedMemberName`.

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

Create and switch between festival years (UC-01). Actor: Administrator.

Display:

| Information         |
| -------------------- |
| Name (e.g. 2026)     |
| Edition (回次, e.g. 第45回 — display-only, computed client-side as `name`(西暦) − 1981; 2026 → 45th, 2027 → 46th) |
| Start date / End date |
| Active (運用中)      |

Actions:

* Create a new Year — copies every Company forward as a Yearly Company for the new Year (`companyStatus` auto-computed, see `spec/domain.md` → Company Status), and makes the new Year active in place of whichever Year was active before.
* Click a row to open that Year's Yearly Company List (`/yearly-companies?yearId=`, current or past), scoped to that Year regardless of which Year is active.

Only one Year is active at a time. `/yearly-companies` and `/sponsorship-menus` scope to the active Year (or the clicked-through Year, per above).

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

Assign one or more Sponsorship Advisors to each Sponsorship Member (UC-03, FR-013). A Member may have multiple Advisors at once. Actor: Administrator.

Display, one row per User. Holding the Advisor Role (`spec/domain.md#Role`) is what qualifies a User to be picked as an advisor, but the dropdown does not yet filter by it — any User may currently be picked as a Sponsorship Member or an Advisor here (see User List above); restricting the picker to Advisor-Role holders is a possible future enhancement, not yet implemented.

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
サイドバー

├── ダッシュボード         Dashboard
│
├── 企業一覧               Companies
│
├── 協賛企業(年度別)        Yearly Companies
│
├── 協賛メニュー           Sponsorship Menus
│
├── 広告制作管理           Contract Menus
│
├── 財務                   Finance
│
├── 年度                   Years
│
├── ユーザー               Users
│
├── アドバイザー割当       Advisor Assignments
│
└── 設定                   Settings
```

Sidebar labels are Japanese (right column above is the internal/route name only, not shown to users). Items are ordered by expected frequency of use for the broadest role (Sponsorship Member) first, admin-only items last.

Each item is shown only to the Roles that can use it (`spec/frontend.md` → User Roles, `spec/domain.md#Role`) — e.g. Finance is hidden unless the signed-in User holds the Finance Department Role, Users/Advisor Assignments/Settings unless they hold Administrator. Administrator sees everything (superuser, `spec/model.md#UserRole`). This gating, and read-vs-edit restriction within a visible page, is a firm requirement — not yet implemented (see Issue tracking for Login/roles).

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

## Principle 5: Actions Are Icons, Not Text Buttons

Row-level and toolbar actions (edit, delete, add, upload, etc.) use icons with a tooltip label, not text buttons — keeps dense tables (Yearly Company List, Contract Menu List) scannable at the ~500-company/20-member scale noted above.

---

## Principle 6: Point at the Error, Not Just at the Form

When a submission is rejected (e.g. Create Contract validation), highlight the specific invalid field(s) inline, not just a generic top-of-form error banner — the user should not have to guess which of several inputs is wrong.

---

# Future Extensions

Potential improvements:

* Mobile-friendly sponsorship member interface
* Notification system — incl. a Slack alert when a capped Sponsorship Menu (`maxQuantity`) nears capacity, see Ad Material Progress above
* Analytics dashboard
* Calendar integration
