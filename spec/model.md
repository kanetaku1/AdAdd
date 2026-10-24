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
                ├──── CompanyAssignment (0..1)
                └──── ActivityLog

Company

User
    ├──── UserRole ──→ Role
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
| issuerName            | string |  | Document issuer name (e.g. 長岡技術科学大学 技大祭実行委員会) |
| issuerPostalCode      | string |  | Issuer postal code |
| issuerAddressLine1    | string |  | Issuer address, first line |
| issuerAddressLine2    | string |  | Issuer address, second line (e.g. 長岡技術科学大学内) |
| issuerEmail           | string |  | Issuer contact email (the sponsorship Google Group) |
| bankName              | string |  | Bank transfer destination: bank name |
| bankBranchName        | string |  | Bank transfer destination: branch name |
| bankAccountType       | string |  | Bank transfer destination: account type (e.g. 普通預金) |
| bankAccountNumber     | string |  | Bank transfer destination: account number |
| bankAccountHolderName | string |  | Bank transfer destination: account holder name |

The `issuer*` and `bank*` attributes are the **document issuer information** printed on that Year's invoices and receipts (FR-015, `spec/domain.md#Document Issuer Information`). They replace the constants previously hard-coded in the frontend (`apps/web/src/lib/pdf/constants.ts`), so an Administrator can change them without a redeploy. They are plain text, printed as entered — e.g. the bank and branch codes may be written inside `bankName` / `bankBranchName` as they are today (`大光銀行（金融機関コード : 0532）`).

Both documents use the `issuer*` attributes; only the invoice uses the `bank*` attributes.

Creating a new Year (`POST /years`) copies every `issuer*` and `bank*` attribute from the previous Year. The Administrator then edits them (`spec/api.md#Update Document Issuer Information`). The first Year, with no previous Year, starts empty.

**Required fields for document generation.** The attributes are nullable in storage, but a document cannot be generated while a field it needs is empty — the UI blocks generation and lists the missing fields (`spec/frontend.md#Invoice and Receipt Documents`):

| Document | Required |
| -------- | -------- |
| Invoice  | `issuerName`, `issuerPostalCode`, `issuerAddressLine1`, `issuerEmail`, `bankName`, `bankBranchName`, `bankAccountType`, `bankAccountNumber`, `bankAccountHolderName` |
| Receipt  | `issuerName`, `issuerPostalCode`, `issuerAddressLine1`, `issuerEmail` |

`issuerAddressLine2` is optional.

The seal image (印影) is not a Year attribute. It stays in the repository as `apps/web/public/images/43rd_Stamp.png`, by the user's decision on Issue #176 (`spec/domain.md#Document Issuer Information`).

`name`, `startDate`, and `endDate` can be corrected by an Administrator while the Year is active (`spec/api.md#Update Year`). `isActive` is never edited directly; it changes only when a new Year is created (`spec/domain.md#Active Year and Past Years`).

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

A Company does not store a Slack ID. The Slack ID used for outreach notifications (see FR-014) belongs to the internal Sponsorship Member assigned via `CompanyAssignment`, not to the Company — see `User.slackId`.

---

## YearlyCompany

Represents one company's activity during one festival year.

This is the central model of AdAdd.

### Attributes

| Name                | Type     |
| ------------------- | -------- |
| id                  | UUID     |
| yearId              | UUID     |
| companyId           | UUID     |
| companyStatus       | enum     |
| phase               | enum     |
| progress            | enum     |
| postalCode          | string   |
| address             | string   |
| phoneNumber         | string   |
| website             | string   |
| contactPersonName   | string   |
| contactEmailOrForm  | string   |
| memo                | text     |
| notes               | text     |
| createdAt           | datetime |
| updatedAt           | datetime |

YearlyCompany does not reference an Advisor. Advisors are assigned to Sponsorship Members via `AdvisorAssignment`.

`companyStatus` (Continuing / New / Dormant) reflects the company's sponsorship history, independent of `phase`.

`phase` (Phase1 / Phase2 / Phase3) is the outreach priority ranking set by a Sponsorship Member during the Year preparation period (see `spec/usecase.md` UC-02). It must never be confused with `companyStatus` — a company's history does not determine its phase.

`postalCode`, `address`, `phoneNumber`, `website`, `contactPersonName`, `contactEmailOrForm`, and `memo` are a **per-Year working copy** of the corresponding `Company` fields, taken when the Yearly Company is created (`POST /years` bulk generation and `POST /years/{yearId}/companies`). They are what Yearly Company Detail displays and edits for that Year.

Saving those fields on Detail updates **this** Yearly Company and overwrites the same fields on `Company` (the master is "the latest known contact", with no history). Other Years' Yearly Companies are not updated. `PATCH /companies/{companyId}` updates the master only and does not write through to existing Yearly Companies.

`companyName` / `companyNameKana` / `firstSponsorshipYear` stay on `Company` (identity / pre-AdAdd history). `notes` is unused in the UI; handover text is `memo`.

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
| remarks         | text     |

A contract has no assignee attribute. The assignee of the contract, and of every Contract Menu under it, is the Yearly Company's current `CompanyAssignment` (decided by an Administrator — see `spec/usecase.md` UC-04), read at display time. A former `assigneeId` copied at creation was removed because it went stale when the assignment changed (Issue #172). A contract can be created while the Yearly Company has no `CompanyAssignment`. Who created the contract is traced through the `CONTRACT_CREATED` ActivityLog entry (`userId` = the acting user).

A `SponsorshipContract` record is only created once an agreement is actually reached (see `spec/usecase.md` UC-06) — there is no separate draft state, so no `status` field is needed here. `contractDate` is the single date the agreement was reached. Overall progress (including whether the engagement is fully wrapped up) is tracked on `YearlyCompany.progress`, not duplicated on the contract.

Creating a `SponsorshipContract` sets `YearlyCompany.progress` to `Confirmed` automatically. A `Payment` is created separately when registered for a contract whose `totalAmount > 0`; a goods-sponsorship-only contract (`totalAmount = 0`) gets no `Payment` (`spec/domain.md#Sponsorship Contract`).

`totalAmount` is accepted at creation as an initial value but is server-maintained thereafter: it is recalculated as the sum of `quantity * unitPrice` across the contract's Contract Menus every time a Contract Menu is added, updated, or removed (see `ContractMenu` below). Clients should treat it as read-only once Contract Menus exist.

---

## SponsorshipMenu

Represents one type of sponsorship benefit offered during a festival year.

This is master data, managed independently of any company or contract.

### Attributes

| Name               | Type            |
| ------------------ | --------------- |
| id                 | UUID            |
| yearId             | UUID            |
| name               | string          |
| defaultPrice       | decimal         |
| requiresSubmission | boolean         |
| isActive           | boolean         |
| maxQuantity        | integer, nullable |

`requiresSubmission` alone determines the Contract Menu's management workflow (submission/production tracking vs. none) — there is no separate category field. A previous `category` (Advertisement/Booth) enum was removed because it never carried information beyond what `requiresSubmission` already expressed (see `spec/domain.md`). Changing `requiresSubmission` later does not rewrite existing Contract Menus (their `productionType` and `status` stay as stored).

`isActive = false` means the menu is no longer offered: it cannot be referenced by a newly added Contract Menu. Existing Contract Menus that reference it are unaffected.

A Year's menus can be copied from the immediately preceding Year on demand (`spec/api.md#Copy Sponsorship Menus from the Previous Year`). A copy is a new row with the target `yearId`; it keeps no link to the source menu.

`maxQuantity` is an optional sponsorship cap for menus with limited availability (e.g. a fixed number of booth slots). `null` means unlimited. It bounds the sum of `quantity` across that menu's Contract Menus for the Year — see `spec/frontend.md#Ad Material Progress` for how fill-against-cap is surfaced.

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
| productionDepartment | enum (nullable) |
| status            | enum     |
| driveFolderId     | string   |
| driveUrl          | string   |
| submittedAt       | datetime |
| remarks           | text     |

ContractMenu does not have its own assignee. Like its contract, it is handled by the Yearly Company's `CompanyAssignment`.

`status` may be changed to any `ContractMenuStatus` value in any order. The order Waiting → Requested → Producing → Completed → Submitted is the usual one, not an enforced one, because material is sent back and redone (`spec/domain.md#Contract Menu`).

`unitPrice` defaults from the referenced `SponsorshipMenu.defaultPrice` but may be overridden per contract (e.g. a negotiated discount). `SponsorshipContract.totalAmount` is the sum of `quantity * unitPrice` across its Contract Menus. `quantity`, `unitPrice`, `isGoodsSponsorship`, and `productionType` remain editable after creation (not just at creation), each recalculating `totalAmount` per the rule above — see `spec/api.md#Update Contract Menu`.

`productionDepartment` (`ContractMenuProductionDepartment`) is the committee department that produces an `INTERNAL` Contract Menu (`spec/domain.md#Contract Menu Production Department`, Issue #127). It is `null` until assigned, and always `null` when `productionType` is not `INTERNAL`. `productionType` stays `INTERNAL` when a department is assigned. Only the Advertisement Manager Role and Administrator set it, through its own endpoint (`spec/api.md#Assign Contract Menu Production Department`); it does not change `totalAmount`. When `productionType` changes from `INTERNAL` to anything else, the server clears `productionDepartment` in the same update.

`status` is changed only by the Advertisement Manager Role and Administrator (`spec/api.md#Update Contract Menu Status`, Issue #126).

`isGoodsSponsorship` marks this Contract Menu as a free return for goods sponsorship (物品協賛) rather than a paid item — same `SponsorshipMenu`, but `unitPrice` is conventionally `0` when this is true. This is a per-Contract-Menu flag, not a property of the Sponsorship Menu itself, because the same menu (e.g. a Pamphlet ad) can be sold normally in one contract and given as a goods-sponsorship return in another. The goods received (description, estimated value) are recorded in `SponsorshipContract.remarks`, not here (see `spec/domain.md` → Contract Menu → Goods Sponsorship).

---

## Payment

Represents payment information for a contract's sponsorship amount.

### Attributes

| Name          | Type     |
| ------------- | -------- |
| id            | UUID     |
| contractId    | UUID     |
| amount         | decimal            |
| receivedAmount | decimal, nullable  |
| remarks        | text               |
| status         | enum               |
| confirmedAt    | datetime           |
| confirmedById  | UUID               |

`amount` is the **billed amount** (請求額): the contract total that was invoiced. `receivedAmount` is the **received amount** (実入金額): what the Finance Department has actually seen arrive in the bank account. `null` means nothing has been recorded yet. The difference (`receivedAmount − amount`) is computed for display and is not stored. `remarks` (備考) is free text for the Finance Department, typically the reason for a difference (Issue #171).

`receivedAmount` and `remarks` are entered by the Finance Department (and Administrator), in both `Waiting` and `Confirmed`:

* **Bank fee deducted / overpayment** — `receivedAmount` is the amount as it arrived; the Payment may be `Confirmed` although it differs from `amount`; the reason goes in `remarks`.
* **Split payment** — `receivedAmount` is overwritten with the cumulative total each time a transfer arrives. The Payment is `Confirmed` once the full amount has arrived. There is no partial-payment status.

Rules:

* **Required to confirm.** A Payment cannot move to `Confirmed` while `receivedAmount` is `null`. The confirmation input defaults to `amount` (the billed amount).
* **Editable after confirmation.** `receivedAmount` and `remarks` can be changed while the Payment stays `Confirmed`; it does not need to go back to `Waiting`.
* **Kept on revert.** Moving a Payment back to `Waiting` keeps `receivedAmount` (only `confirmedAt`/`confirmedById` are cleared).
* **Recorded.** Every change of `receivedAmount` or `remarks` is recorded in ActivityLog as `PAYMENT_DETAILS_UPDATED` (event type defined with Issue #172).
* **Printed on the receipt.** The receipt for a `Confirmed` Payment uses `receivedAmount` as its amount (FR-015 → Receipt Timing).

AdAdd does not block confirmation on a difference between `receivedAmount` and `amount`.

`confirmedById` references the `User` who performed the confirmation (renamed from `confirmedBy` for consistency with the `xId`-suffixed foreign-key naming used elsewhere, e.g. `yearlyCompanyId`).

`confirmedAt` is the **payment confirmation date** — the date the Finance Department confirmed the bank transfer in AdAdd (`spec/domain.md` → Payment), not necessarily the date the bank transfer itself occurred. It is set automatically to the day the status is changed to Confirmed; there is no separate "actual transfer date" field. This date is the default payment date when generating the receipt for a `Confirmed` Payment (`spec/usecase.md` UC-10 Send Receipt). A receipt generated while the Payment is `Waiting` has no default payment date; it is entered manually.

A `Payment` is created when it is registered for a contract whose current `totalAmount > 0` — a goods-sponsorship-only contract has no `Payment` row at all, not a `Payment` with `amount = 0`. Moving `status` back from `Confirmed` to `Waiting` clears `confirmedAt`/`confirmedById`.

The Yearly Company's `progress` always matches `status`, and the server keeps it so in the same transaction (`spec/domain.md` → Lifecycle → Sponsorship Progress Consistency):

* `status` becomes `Confirmed` → `progress` becomes `PaymentReceived`, unless it is already `ReceiptSent` (kept).
* `status` moves back from `Confirmed` to `Waiting` → if `progress` is `PaymentReceived` or `ReceiptSent`, it becomes `Confirmed`; other values are kept.
 How the actual received amount decides when the Payment becomes `Confirmed` is defined by Issue #171; the progress rule applies whenever `status` changes, however that change is triggered.

While a Payment is `Waiting`, its `amount` is not independently edited: it is kept in sync with the parent `SponsorshipContract.totalAmount`. Any Contract Menu add/update/delete recalculates the Contract total and, in the same transaction, updates the Waiting Payment amount to the same value.

Once a Payment is `Confirmed`, its `amount` (billed amount) is fixed as the amount the Finance Department confirmed against; what actually arrived is `receivedAmount`. A Contract Menu add/update/delete that would change the parent Contract total must be rejected while the Payment remains Confirmed, rather than silently creating a mismatch. To change the contract amount after confirmation, the Payment must first be moved back to `Waiting`, which clears `confirmedAt`/`confirmedById`; the Contract Menu change can then resynchronize the Waiting Payment amount.

---

## CompanyAssignment

Represents the Sponsorship Member responsible for a Yearly Company.

A Yearly Company has at most one CompanyAssignment (`yearlyCompanyId` is unique) — zero before an assignee is decided, one afterward. A single Sponsorship Member may be the assignee for multiple Yearly Companies.

### Attributes

| Name            | Type     |
| --------------- | -------- |
| id              | UUID     |
| yearlyCompanyId | UUID     |
| userId          | UUID     |
| assignedAt      | datetime |

The assignee's permissions come from `UserRole`, not from a field on this relationship.

---

## AdvisorAssignment

Represents the supervision relationship between a Sponsorship Advisor and a Sponsorship Member.

An Advisor is assigned to a Member, not to a Yearly Company. A Sponsorship Member may have multiple Advisors within the same Year (no upper bound); this is independent of `CompanyAssignment`.

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

Stores business history. User-facing name: **活動記録** (`spec/domain.md#Activity Log`).

### Attributes

| Name            | Type     |
| --------------- | -------- |
| id              | UUID     |
| yearlyCompanyId | UUID     |
| userId          | UUID     |
| action          | string   |
| description     | text     |
| createdAt       | datetime |

`description` (API `message`) is Japanese business language, not raw enum tokens. `createdAt` is displayed in JST (`spec/domain.md#Activity Log`).

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

`slackId` is optional (a User may not have linked their Slack account). It is used to mention that User when a Yearly Company's progress becomes Confirmed — see `spec/usecase.md` UC-16.

---

## Role

Represents system permissions. Fixed, seeded master data — not user-creatable (see `spec/domain.md#Role` for the canonical set of 5).

### Attributes

| Name | Type   |
| ---- | ------ |
| id   | UUID   |
| code | string |
| name | string |

`code` is the stable, machine-readable identifier used by API/authorization checks (e.g. `ADMINISTRATOR`, `FINANCE_DEPARTMENT`) — it never changes even if `name` (the Japanese display label) is edited. One of:

* `SPONSORSHIP_MEMBER`
* `ADVISOR`
* `FINANCE_DEPARTMENT`
* `ADVERTISEMENT_MANAGER` — 広告管理部門 (Issue #126, #127)
* `ADMINISTRATOR`

Holding none of these is a valid, deliberate state (a pre-registered User before an Administrator grants a Role) — it is the view-only baseline, not an error.

---

## UserRole

Represents one Role granted to one User. A User may hold any number of Roles (including zero, e.g. immediately after being pre-registered and before an Administrator assigns a Role); a Role may be held by any number of Users.

### Attributes

| Name       | Type     |
| ---------- | -------- |
| id         | UUID     |
| userId     | UUID     |
| roleId     | UUID     |
| assignedAt | datetime |

`userId` + `roleId` is unique — a Role cannot be granted to the same User twice.

---

# Enumerations

## CompanyStatus

The company's relationship history with the festival. Applies to `YearlyCompany.companyStatus`.

* Continuing
* New
* Dormant

---

## SponsorshipPhase

The outreach priority ranking for a Yearly Company within the current Year, set by a Sponsorship Member during the preparation period. Applies to `YearlyCompany.phase`. Independent of `CompanyStatus`.

* Phase1
* Phase2
* Phase3

---

## SponsorshipProgress

* NotContacted
* MaterialsSent
* Confirmed
* GoodsReceived
* InvoiceSent
* PaymentReceived
* ReceiptSent
* Declined
* Pending

API / storage codes: `NOT_CONTACTED` (未連絡), `MATERIALS_SENT` (資料送付), `CONFIRMED` (協賛確定), `GOODS_RECEIVED` (物品受領), `INVOICE_SENT` (請求書送付), `PAYMENT_RECEIVED` (協賛金入金), `RECEIPT_SENT` (領収書送付), `DECLINED` (見送り), `PENDING` (保留).

`GoodsReceived` is used only by goods-sponsorship-only contracts (no Payment) and is set by hand after `Confirmed`. The payment stages (`PaymentReceived`, `ReceiptSent`) follow the Payment status — see the YearlyCompany constraints below and `spec/domain.md` → Lifecycle → Sponsorship Progress Consistency.

---

## ContractMenuProductionType

Applies only when the referenced Sponsorship Menu has `requiresSubmission = true`. Chosen by the company on the Google Forms application; determines whether the company's submission is a finished product or raw material (see `spec/business.md` → Contract Menu Production Type).

* Company — company submits a finished product (完成品)
* Internal — company submits raw material (素材) for the committee to produce from. The business calls this 委員会; the UI label is 委員. The producing department is held separately in `ContractMenu.productionDepartment` (`ContractMenuProductionDepartment` below).

---

## ContractMenuProductionDepartment

Applies to `ContractMenu.productionDepartment`, only when `productionType` is `INTERNAL`. `null` means not assigned yet.

* `DOCUMENT_CREATION_DEPARTMENT` — 資料作成部門
* `PRODUCTION_BUREAU` — 制作局
* `SOCIAL_MEDIA_DEPARTMENT` — SNS部門

This is a fixed enumeration, not a reference to the organizational Department (`spec/masters.md#Department`, which is not an entity).

---

## ContractMenuStatus

* Waiting
* Requested
* Producing
* Completed
* Submitted

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

1 ----- 0..1

CompanyAssignment

1 ----- *

ActivityLog

1 ----- 0..1

SponsorshipContract
```

---

## SponsorshipContract

```
SponsorshipContract
      │
      ├── ContractMenu (1 ----- *)
      │
      └── Payment (1 ----- 0..1)
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

CompanyAssignment

1 ----- *

ActivityLog

1 ----- *

AdvisorAssignment (as Advisor)

1 ----- *

AdvisorAssignment (as Member)

1 ----- *

UserRole ----- 1  Role
```

A User has zero or more UserRole rows, each pointing to one Role — i.e. User:Role is many-to-many through UserRole.

---

# Constraints

## Company

* Company name must be unique.

---

## YearlyCompany

* One Company can appear only once in the same Year.
* Company + Year must be unique.
* `progress` cannot be set to `Confirmed` while the Yearly Company has no contract.
* `progress` cannot be set to a pre-contract stage (`NotContacted`, `MaterialsSent`, `Declined`, `Pending`) while a contract exists. `InvoiceSent` is allowed.
* `progress` cannot be set to `PaymentReceived` unless the contract's Payment is `Confirmed`, and cannot be set to `ReceiptSent` when there is no contract or while the contract's Payment is not `Confirmed`.
* `progress` can be set to `GoodsReceived` only when a contract exists and it has no Payment (goods-only). It may be set back to `Confirmed` by hand. When a Payment is created for a contract at `GoodsReceived`, `progress` moves back to `Confirmed` automatically.

---

## CompanyAssignment

* A Yearly Company has at most one CompanyAssignment — `yearlyCompanyId` is unique.

---

## AdvisorAssignment

* A Sponsorship Member may have multiple Advisors within the same Year (no upper bound).
* Year + memberId + advisorId must be unique (the same Advisor cannot be assigned twice to the same Member in the same Year).
* A YearlyCompany must never store a direct reference to an Advisor.

---

## UserRole

* `userId` + `roleId` must be unique — a Role cannot be granted to the same User twice.
* Role is seeded master data (the 5 codes in `spec/model.md#Role`); Roles are never created through a user-facing API, only granted to/revoked from Users.
* Administrator is a superuser: it satisfies every permission check independent of any other Role the User holds.

---

## SponsorshipContract

* Every contract belongs to one Yearly Company.
* A Yearly Company has at most one contract — `yearlyCompanyId` is unique on `SponsorshipContract`.
* A contract stores no assignee; the assignee is the Yearly Company's `CompanyAssignment`.
* A contract may exist while the Yearly Company has no `CompanyAssignment`.

---

## SponsorshipMenu

* Every Sponsorship Menu belongs to one Year.
* Name must be unique within the same Year.

---

## ContractMenu

* Every Contract Menu belongs to one Sponsorship Contract.
* Every Contract Menu references exactly one Sponsorship Menu.
* `sponsorshipMenuId` must belong to the same Year as the contract's Yearly Company.
* A newly added Contract Menu must reference a Sponsorship Menu with `isActive = true`.
* `productionDepartment` is non-null only when `productionType` is `INTERNAL`.

---

## Payment

* Every payment belongs to one contract.
* A Sponsorship Contract has at most one Payment — `contractId` is unique on `Payment`. A split/installment payment is still one Payment; each transfer overwrites `receivedAmount` with the cumulative total.
* A Waiting Payment's `amount` must equal its Contract's `totalAmount`.
* `receivedAmount` is never synchronized from the Contract; only the Finance Department (or Administrator) sets it. It may differ from `amount`, including on a `Confirmed` Payment.
* A Confirmed Payment's `amount` must not be silently changed by Contract Menu edits; any Contract Menu change that would alter the Contract total while the Payment is Confirmed is rejected.

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
* The assignee of a Sponsorship Contract and its Contract Menus is the Yearly Company's CompanyAssignment; neither stores one of its own.
* A User must be pre-registered (by email, by an Administrator) before they can authenticate — there is no self-service signup, regardless of authentication provider.
* Roles are granted by an Administrator through UserRole; a User is never able to grant themselves a Role.
* Deletion is Administrator-only across the system (e.g. Company, Sponsorship Menu, Contract Menu, AdvisorAssignment, UserRole). Non-Administrator Roles may create and update but never delete — see `spec/api.md#Authorization Matrix`.
* ActivityLog entries are created only by the system, and only when a value actually changes — there is no manual/user-authored entry point. The recorded operations are listed in `spec/domain.md#Activity Log`.

---

# Future Extensions

The model is designed to support future features without changing the core structure.

Possible extensions include:

* Printing schedules
* Email synchronization
* Accounting integration
* Automatic address/postal code validation on Company entry (the legacy spreadsheet performed this with a formula-based AI function; not a stored field, and not yet implemented in AdAdd)

These extensions should reference existing entities rather than introducing duplicate business concepts.
