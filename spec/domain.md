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
              └──── Activity Log（活動記録）
```

A Sponsorship Menu is the yearly master definition of what can be sponsored (e.g. Pamphlet advertisement, Homepage banner advertisement, Company booth). A Contract Menu is the concrete instance a company actually contracted for, carrying its own progress, assignee, and Drive folder. A Contract Menu may be a goods-sponsorship return (`isGoodsSponsorship`) rather than a paid item — see Contract Menu → Goods Sponsorship below.

---

# Aggregates

## Year

Represents one festival cycle.

### Responsibilities

* Manage festival years
* Archive yearly data
* Separate yearly business information
* Document issuer information for that Year's invoices and receipts (committee name, address, contact email, bank transfer account)

A Year is never deleted. It owns that cycle's Yearly Companies, Sponsorship Menus, Contracts, and Payments, and the next Year's Company Status is computed from it (see Company Status below). Deleting it would orphan that history and change later statuses (`spec/database.md#Preserve Historical Data`, `spec/api.md#Festival Year API`).

### Relationships

```
Year
 ├── YearlyCompany (0..*)
 └── SponsorshipMenu (0..*)
```

### Active Year and Past Years

Exactly one Year is active: the most recently created one. Creating a new Year makes every earlier Year a **past Year**. There is no separate archive step, and a past Year never becomes active again.

A past Year is read-only, with one exception: **payment confirmation**. Bank transfers for the previous cycle can arrive after the next Year has started, so the Finance Department can still confirm a past Year's Payment, or move it back to waiting to correct a mistake.

Everything else in a past Year — Yearly Companies, assignments, Contracts, Contract Menus, Sponsorship Menus, creating Payments — cannot be changed. Viewing it and producing documents from it (invoice and receipt PDFs, CSV export) do not change data and stay available.

Company master data is not part of any Year and stays editable.

Payment confirmation in a past Year includes recording the received amount and the remarks of that Payment (see Payment below), since a late or split transfer is exactly the case this exception exists for.

### Correcting a Year

A Year is never deleted, so a Year created with a wrong name or period is corrected in place. An Administrator can change the Year's `name`, `startDate`, and `endDate` (`spec/api.md#Update Year`). The correction does not touch anything the Year owns.

The Past Years rule above applies to the Year itself: a past Year's name and period cannot be changed. Whether a past Year's name should become correctable is not decided (Issue #172).

### Document Issuer Information

The issuer block and the bank transfer account printed on invoices and receipts (FR-015) belong to the Year, not to the frontend source code. The committee's contact details and its bank account can change between Years, and an Administrator must be able to update them in the UI without a redeploy (Issue #170).

Creating a new Year copies the issuer information and bank transfer account from the previous Year; the Administrator then edits them as needed.

A document is always produced with the issuer information of the Contract's own Year, so a past Year's invoice or receipt keeps that Year's issuer and account. If a required field is empty, the document cannot be generated (`spec/model.md#Year`).

The seal image (印影) is not part of the Year. It stays as an image file in the source code repository (`apps/web/public/images/43rd_Stamp.png`), as on the receipts issued so far. Issue #176 raised moving it out of the public repository; the user decided to keep it there, and no seal-image management feature is built. Only the bank account moves out of the source code.

---

## Sponsorship Menu

Represents one type of sponsorship benefit offered during a festival year.

This is master data. It defines what can be sponsored, not what a specific company sponsored.

### Responsibilities

* Name
* Default price
* Whether submission/production is required
* Whether the menu is currently offered
* Optional sponsorship cap (max quantity) for menus with limited availability

A menu that is not currently offered (`isActive = false`) cannot be newly added to a contract. Contract Menus that already reference it stay as they are.

Changing a menu's `requiresSubmission` later does not change existing Contract Menus. Their stored production type and status are kept; only Contract Menus added afterwards follow the new value.

### Relationships

```
Year
 └── SponsorshipMenu (0..*)
      └── ContractMenu (0..*)
```

### Copying Menus from the Previous Year

Sponsorship Menus are defined per Year, and most menus repeat from one Year to the next. After a new Year is created, a user who can manage Sponsorship Menus may run **copy menus from the previous Year**, and then edit prices and other attributes in the new Year.

* It is optional and manual. Creating a Year never copies menus by itself.
* The source is the Year immediately preceding the target Year — the same "previous Year" that Company Status uses (see Company Status below).
* Each copied menu is a new Sponsorship Menu owned by the target Year. The previous Year's menus, and the Contract Menus that reference them, are not changed.
* The target must be the active Year (past Years are read-only).

See `spec/api.md#Copy Sponsorship Menus from the Previous Year`.

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
* Assigned member (at most one — see Company Assignment)
* Company status (continuing / new / dormant)
* Sponsorship phase (outreach priority ranking for the current Year)
* Per-Year working copy of company contact (address, phone, website, company-side contact person, contact, handover memo)
* Activity history
* Sponsorship contracts

Contact fields on a Yearly Company are copied from `Company` at creation. They are the working copy for that Year — a later change to the Company master, or to another Year's Yearly Company, does not rewrite them. Saving contact on Yearly Company Detail updates this Year's copy and overwrites the Company master (latest known contact; no master history).

Advisors are not assigned to a Yearly Company directly. An Advisor supervises Sponsorship Members, and monitors company progress indirectly through the members assigned to that company.

### Relationships

```
YearlyCompany

├── Year
├── Company
├── CompanyAssignment (0..1)
├── SponsorshipContract
└── ActivityLog
```

---

## Sponsorship Contract

Represents one sponsorship agreement.

A Yearly Company has at most one contract (zero before it is created). A single company/organization is invoiced and receipted once per Year, even though the contract may bundle multiple Sponsorship Menus (via multiple Contract Menus).

### Responsibilities

* Contract information
* Sponsorship contents (Contract Menus)

### Assignee

A Sponsorship Contract has no assignee of its own. The member responsible for the contract, and for every Contract Menu under it, is always the Yearly Company's current Company Assignment. Changing the assignment changes who is shown for the contract at once; there is no second copy to fall out of date.

A contract can be created while the Yearly Company has no assignee. Who created the contract is recorded in the Activity Log (`CONTRACT_CREATED`, with the acting user), not on the contract.

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

The management content differs depending on the referenced Sponsorship Menu's `requiresSubmission`: submission/production management when true (e.g. print advertisements, web-based formats such as a homepage banner), or none when false (e.g. company booth — booth logistics only).

### Goods Sponsorship (物品協賛)

A company may sponsor with goods/items instead of money. The festival provides advertising in exchange, equivalent to the value of the goods received.

Goods sponsorship is **not** a Sponsorship Menu of its own — the same Sponsorship Menu (e.g. a Pamphlet ad) is contracted normally in some contracts and given as a goods-sponsorship return in others, so the distinction cannot live on the menu. It is a property of the individual Contract Menu:

* `ContractMenu.isGoodsSponsorship` (boolean) marks that this specific line is provided free of charge as a return for goods received, rather than a paid item. When true, `unitPrice` is conventionally `0`.
* The goods description and estimated value are recorded in `SponsorshipContract.remarks` (free text, contract-wide — not per Contract Menu) — this content is always entered manually, never imported from Google Forms (see `spec/usecase.md` UC-06).
* A contract may mix ordinary paid Contract Menus and `isGoodsSponsorship` ones; `SponsorshipContract.totalAmount` still sums `quantity * unitPrice` across all of them, so goods-sponsorship-only contracts correctly total ¥0.

### Responsibilities

* Quantity and unit price
* Production method (when submission is required)
* Production department (when the production method is Internal Production — see Contract Menu Production Department below)
* Progress status
* Google Drive folder

### Relationships

```
SponsorshipContract
        │
        └── ContractMenu ──→ SponsorshipMenu
```

---

## Payment

Represents payment information for a contract.

A Sponsorship Contract has at most one Payment, in every case below.

### Responsibilities

* Billed amount (the contract total)
* Received amount (実入金額 — what actually arrived, recorded by the Finance Department)
* Remarks (備考 — e.g. the reason the received amount differs from the billed amount)
* Payment status
* Confirmation (date and performer of the Finance Department's manual confirmation — see `spec/model.md#Payment`, `confirmedAt`/`confirmedById`)

### Amount Differences

Decided in Issue #171:

* **Bank fee deducted, or overpayment.** The Finance Department records the received amount as it arrived and may confirm the Payment even though it differs from the billed amount. The difference (received amount − billed amount) is shown, and the reason is written in the remarks.
* **Split payment.** Each time a transfer arrives, the received amount is overwritten with the cumulative total so far. The Payment stays Waiting until the full amount is in, and is then confirmed. There is no partial-payment status. The history of each transfer is traced through 活動記録 and the remarks.

AdAdd does not decide whether a difference is acceptable. Confirming is the Finance Department's judgment; the system only keeps the billed amount, the received amount, and the remarks side by side.

The received amount is required to confirm a Payment; its input defaults to the billed amount. After confirmation, the received amount and the remarks stay editable without moving the Payment back to Waiting. Moving the Payment back to Waiting keeps the received amount.

The receipt prints the received amount (see `spec/requirements.md` FR-015 → Receipt Timing).

### Relation to Sponsorship Progress

Confirming a Payment moves the Yearly Company's progress to Payment Received (協賛金入金), or keeps Receipt Sent (領収書送付); moving the Payment back to Waiting returns 協賛金入金 / 領収書送付 to Sponsorship Confirmed (協賛確定) (see Lifecycle → Sponsorship Progress Consistency). Payment reverts are recorded in 活動記録, and so are changes to the received amount and remarks (`PAYMENT_DETAILS_UPDATED`).

### Relationships

```
SponsorshipContract
        │
        └── Payment
```

---

## Activity Log（活動記録）

Represents business history. The user-facing name is **活動記録**.

Every important action should generate an Activity Log automatically — there is no manual/user-authored entry. History should never be modified.

Messages are written in Japanese using business labels (`spec/frontend.md` Principle 2), not raw enum tokens. Example: `進捗を「資料送付」から「請求書送付」に更新`, not `進捗を MATERIALS_SENT から INVOICE_SENT に更新`.

`createdAt` is shown in Japan Standard Time (JST, Asia/Tokyo). Persistence remains a timezone-aware datetime; the UI always renders JST so committee work is read in Japan time regardless of the viewer's browser timezone.

### What Is Recorded

An entry is written only when a value actually changes. Saving the same value again writes nothing.

* Progress, company status, and phase changes (including progress changed automatically by the server — see Lifecycle → Sponsorship Progress Consistency)
* Member assigned or cleared
* Contract created (the acting user is who made the contract)
* Contract edited (contract date, remarks)
* Contract Menu added or removed
* Contract Menu quantity or unit price changed
* Contract Menu status changed (ad status)
* Payment confirmed, and payment confirmation reverted
* Payment actual received amount or remarks changed (the fields are defined by Issue #170 / #171)
* Company contact information changed on the Yearly Company

The exact event types are in `spec/api.md#List Activity Logs for a Yearly Company`.

---

# Supporting Entities

## User

Represents a system user.

A user may have multiple roles.

---

## Role

Represents permissions. A User may hold multiple Roles at once, and Roles may be granted or revoked at any time (see `spec/frontend.md` → System Administration → User List).

The canonical set (matching the actor roles in `spec/frontend.md` → User Roles) is:

* Sponsorship Member
* Advisor
* Finance Department
* Advertisement Manager（広告管理部門）
* Administrator

A User holding none of these has base-level, read-only access — this replaced the earlier "General Member" Role, which added nothing beyond that baseline. Company Management Department and Sponsorship Menu Management Team were removed as separate Roles: master-data management (Company, Year, Sponsorship Menu) is now Sponsorship Member's responsibility, and Year creation is Administrator-only (see `spec/api.md#Authorization Matrix`).

Advertisement Manager (`ADVERTISEMENT_MANAGER`, display name 広告管理部門) is a Role, not a Department (Issue #126, #127). Two Contract Menu operations belong to it alone, not to every Sponsorship Member:

* Changing a Contract Menu's status (Contract Menu Status below).
* Assigning the production department of an Internal Production Contract Menu (Contract Menu Production Department below).

On its own, the Role also covers the other work of the 広告管理 screen (Contract Menu List): production type, production information (remarks, Drive URL), and Drive upload. It does not cover money-related edits (quantity, unit price, goods sponsorship); those stay with Sponsorship Member — see `spec/api.md#Authorization Matrix`.

A User who belongs to the 広告管理部門 receives this Role through `UserRole` like any other Role. Usually the holder also holds `SPONSORSHIP_MEMBER`. Because the 広告管理部門 works with other bureaus (e.g. the SNS部門), a User may hold `ADVERTISEMENT_MANAGER` alone; the Role must therefore be usable on its own (see its permissions below).

Department stays organizational affiliation only and is never used for permission checks (`spec/masters.md#Department`).

Administrator is a superuser — it satisfies every permission check regardless of what else is required. See `spec/model.md#Role` for the machine-readable `code` per Role and `spec/model.md#UserRole` for how a User is linked to zero or more Roles.

---

## Company Assignment

Represents the Sponsorship Member responsible for a Yearly Company.

A Yearly Company has at most one Company Assignment — zero before an Administrator decides an assignee, one afterward. A single Sponsorship Member may be the assignee for multiple Yearly Companies.

### Responsibilities

* Link one Sponsorship Member to a Yearly Company
* Be the only source of the assignee for the Yearly Company's Sponsorship Contract and its Contract Menus (see Sponsorship Contract → Assignee)

### Relationships

```
YearlyCompany
      │
      └── CompanyAssignment (0..1)
                │
                └── User (Sponsorship Member)
```

---

## Advisor Assignment

Represents the supervision relationship between a Sponsorship Advisor and a Sponsorship Member.

An Advisor is assigned to Members, not to Yearly Companies or Companies. This is independent of Company Assignment — an Advisor supervises a Member, not a specific company.

A Sponsorship Member may have multiple Advisors at once (no upper bound); an Advisor may likewise supervise multiple Members.

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

When a Yearly Company is generated (UC-01, both the bulk per-Year generation and individual mid-cycle registration), `companyStatus` is computed automatically:

* **Continuing** — the Company had a Yearly Company in the immediately preceding Year, and a Sponsorship Contract was created for it.
* **New** — every other case, including a company that was contacted in a previous Year but never reached a contract.

**Exception: history from before AdAdd.** The first Year operated in AdAdd has no preceding Year inside AdAdd, so the rule above would make every company New. For that first load, the Company CSV import carries the fact "had a sponsorship contract in the preceding Year" per row (`previousYearContract`, `spec/api.md#Bulk Import Companies`). The server derives the status from that fact: あり → Continuing, otherwise New. The status itself is still never accepted from input. From the second Year on, the preceding Year exists in AdAdd and the automatic rule applies. The procedure is in `spec/operations.md#Initial Data Migration`.

**Dormant is never auto-assigned at generation.** It is only ever set by a manual reclassification during UC-02 (e.g. the company could not be reached, or has gone out of business) — see the existing inline-editable `companyStatus` on the Yearly Company List (`spec/frontend.md`).

---

## Sponsorship Phase

Represents the outreach priority ranking assigned to a Yearly Company by a Sponsorship Member during the Year preparation period (see UC-02). Independent of Company Status — a Continuing company and a New company can both be assigned any Sponsorship Phase.

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
* Goods Received (物品受領) — goods-sponsorship-only contracts, which have no Payment
* Invoice Sent
* Payment Received
* Receipt Sent
* Declined
* Pending

Goods Received comes after Sponsorship Confirmed. It replaces the payment stages for a contract that has no Payment (goods-only, total ¥0). A contract with both money and goods moves through the payment stages instead. The rules are in Lifecycle → Sponsorship Progress Consistency.

---

## Contract Menu Production Type

Applies only when the referenced Sponsorship Menu requires submission. The company chooses between these when submitting the Google Forms application, and the choice determines what the company submits — a finished product, or raw material for the committee to build from.

* Company Production — the company submits a finished, ready-to-use product (完成品).
* Internal Production — the company submits raw material (素材, e.g. logo, text/copy), and the committee produces the finished product from it.

Internal Production is what the business calls 委員会 (UI label 委員). A Sponsorship Member sets the production type, including Internal Production.

---

## Contract Menu Production Department

Which committee department produces an Internal Production Contract Menu. It is a breakdown of Internal Production, not another production type: the production type stays Internal Production, and the department is held beside it.

* Document Creation Department（資料作成部門）
* Production Bureau（制作局）
* Social Media Department（SNS部門）

Rules:

* Only Internal Production Contract Menus have a production department. For any other production type (Company Production, Continued — present in code, its place in spec is Issue #162 — or none when the menu does not require submission) it is always empty.
* At most one department per Contract Menu. Empty means not assigned yet — the normal state right after a Sponsorship Member sets Internal Production.
* Only the Advertisement Manager Role (and Administrator, as superuser) assigns, changes, or clears it. A Sponsorship Member cannot.
* When the production type changes away from Internal Production, the department is cleared in the same change. A department cannot stay on a Contract Menu that is no longer Internal Production.
* Filtering by Internal Production matches every Internal Production Contract Menu, whatever its department.

This is the production destination of the advertisement. It is unrelated to the Yearly Company's assigned Sponsorship Member (`CompanyAssignment`), which the 広告管理 list shows as 担当者 (Issue #128).

---

## Contract Menu Status

* Waiting
* Requested
* Producing
* Completed
* Submitted

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
               ├──── CompanyAssignment (0..1)
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

A Sponsorship Contract is created only once an agreement is actually reached — there is no separate draft state to track on the contract itself. A contract may be created directly when an agreement is made outside Google Forms.

Overall progress toward completing the engagement (materials sent, invoice sent, payment received, receipt sent) is tracked on `YearlyCompany.progress`, not as a separate lifecycle on the contract.

Creating a Sponsorship Contract sets `YearlyCompany.progress` to Confirmed (協賛確定) automatically — the contract's existence *is* what "confirmed" means, so this isn't a manual step performed separately. A `Payment` (`spec/model.md#Payment`) is created separately when the payment is registered for a contract whose `totalAmount > 0`; a goods-sponsorship-only contract (`totalAmount = 0`) gets no Payment, since no money changes hands.

A contract can be created whether or not a member is assigned to the Yearly Company (see Sponsorship Contract → Assignee).

---

## Sponsorship Progress Consistency

`YearlyCompany.progress` is set by members, but it must not contradict the contract and the payment. In particular, the payment stages of progress always match the Payment's status. The server enforces these rules:

| Situation | Rule |
| --------- | ---- |
| Setting progress to 協賛確定 (`CONFIRMED`) while the Yearly Company has no contract | Rejected (409). Creating the contract is what sets 協賛確定. |
| Setting progress to a pre-contract stage — 未連絡 (`NOT_CONTACTED`), 資料送付 (`MATERIALS_SENT`), 見送り (`DECLINED`), 保留 (`PENDING`) — while a contract exists | Rejected (409). If the company declines after contracting, the contract must be deleted first. |
| Setting progress to 請求書送付 (`INVOICE_SENT`) while a contract exists | Allowed. It is a post-contract stage, used while the Payment is still Waiting. |
| Setting progress to 協賛金入金 (`PAYMENT_RECEIVED`) unless the contract's Payment is Confirmed (including when there is no contract or no Payment) | Rejected (409). 協賛金入金 can only be reached by confirming the Payment. |
| Setting progress to 領収書送付 (`RECEIPT_SENT`) when there is no contract, or while the contract's Payment is not Confirmed | Rejected (409). For a goods-only contract (no Payment), see the undecided points below. |
| Setting progress to 物品受領 (`GOODS_RECEIVED`) when there is no contract, or the contract has a Payment | Rejected (409). 物品受領 is only for goods-only contracts. |
| The contract's Payment becomes Confirmed | Progress moves to 協賛金入金 (`PAYMENT_RECEIVED`) automatically — unless it is already 領収書送付 (`RECEIPT_SENT`), which is kept. |
| The Payment moves back from Confirmed to Waiting | If progress is 協賛金入金 or 領収書送付, it moves back to 協賛確定 (`CONFIRMED`) automatically. Other values are kept. |

The automatic changes are part of the payment confirmation itself. They also apply when a past Year's Payment is confirmed or reverted, since payment confirmation is the one change a past Year accepts (see Active Year and Past Years). Each automatic change is recorded in the Activity Log like a manual one.

### Why the receipt stage follows confirmation

The order in which things happen in the field varies:

* Face-to-face contracts: the member brings both the invoice and the receipt, and is paid on the spot.
* Email contracts: the receipt is usually sent after the payment is confirmed, but not always.

So a receipt PDF can be generated while the Payment is still Waiting (decided in Issue #170 / #171, which changes the earlier rule from Issue #159). Progress, however, is recorded in a fixed order: the Finance Department confirms the Payment in AdAdd (progress becomes 協賛金入金), and only then does progress move to 領収書送付. Even when the receipt was handed over on the spot, 領収書送付 is recorded only after Finance has confirmed the Payment.

### Goods-only contracts

A goods-sponsorship-only contract (`totalAmount = 0`) has no Payment, so the payment stages never apply. After 協賛確定, a member sets 物品受領 (`GOODS_RECEIVED`) by hand once the goods have arrived. A contract with both money and goods has a Payment and moves through the payment stages above; 物品受領 is not used for it.

* A member may set 物品受領 back to 協賛確定 by hand.
* If a paid Contract Menu is later added to a contract at 物品受領 and a Payment is created for it, progress moves back to 協賛確定 automatically, because a contract with a Payment progresses through the payment stages.

Not decided yet (Issue #172):

* Whether 物品受領 and 領収書送付 can follow each other, and whether 領収書送付 can be set for a goods-only contract, which has no Payment to confirm
* How a contract is deleted (needed when a company declines after contracting) — contract deletion is not specified yet
* Whether the automatic move back to 協賛確定 sends the Slack mention (FR-014)

---

## Contract Menu

```
Waiting

↓

Requested

↓

Producing

↓

Completed

↓

Submitted
```

This is the usual order, not an enforced one. A Contract Menu's status may be changed to any status, forward or back, because material is often sent back to the company or redone. For menus that do not require submission (e.g. company booth), the lifecycle may skip directly from Waiting to Completed.

Status is changed only by the Advertisement Manager Role (and Administrator, as superuser) — see `spec/api.md#Update Contract Menu Status`. Other Roles see it read-only. Registering production information or uploading to Drive does not change the status — the status becomes Submitted only through this status change (Issue #166).

A homepage banner requires submission (`requiresSubmission = true`) — the company provides banner artwork/logo data — and follows the full submission lifecycle, the same as a print advertisement.

---

## Payment

```
Waiting

↓

Confirmed
```

Confirmation is performed manually by the Finance Department. Confirming the Payment, and moving it back to Waiting, also moves `YearlyCompany.progress` so that it matches the Payment (see Sponsorship Progress Consistency above).

The received amount may be updated while Waiting (each transfer of a split payment) and while Confirmed (corrections). There is no intermediate status between Waiting and Confirmed (see Payment → Amount Differences).

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

活動記録 (Activity Logs) are append-only.

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

A Contract Menu must never duplicate attributes already defined on its Sponsorship Menu (e.g. name, default price).

---

## Rule 12

A Yearly Company's progress must not contradict its contract and payment (see Lifecycle → Sponsorship Progress Consistency). The server enforces this, not the frontend.

---

## Rule 13

The assignee of a Sponsorship Contract and its Contract Menus is the Yearly Company's Company Assignment. Neither the contract nor a Contract Menu stores an assignee of its own.

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
