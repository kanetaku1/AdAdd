# Business

## Business Overview

AdAdd supports the sponsorship operations of the Nagaoka University of Technology Festival (技大祭).

The system centralizes business information while preserving the existing operational workflow.

Sponsorship operations span an entire festival cycle and involve multiple departments working together.

AdAdd provides a shared platform where every stakeholder can access the same information.

---

# Organization

The sponsorship organization consists of several departments. These are operational/informal team names, not necessarily distinct system Roles — see `# Roles` below for the canonical, implemented Role set.

## Company Management Team

Responsible for:

* Managing company information
* Assigning Sponsorship Advisors to Sponsorship Members
* Assigning Sponsorship Members to companies
* Reviewing each company's status (Continuing / New / Dormant)
* Setting each company's sponsorship phase (outreach priority ranking) for the Year

---

## Sponsorship Members

Responsible for:

* Contacting companies
* Sending sponsorship materials
* Managing communication
* Updating sponsorship progress
* Sending invoices
* Sending receipts

Sponsorship Members may belong to the Industrial Collaboration Division or participate voluntarily.

---

## Sponsorship Advisors

Responsible for:

* Supporting Sponsorship Members
* Monitoring sponsorship progress
* Managing assigned members

An Advisor is assigned to Sponsorship Members, not to companies. An Advisor monitors the progress of companies indirectly, through the members assigned to that Advisor.

An Advisor may also be a Sponsorship Member.

---

## Sponsorship Menu Management Team

Responsible for:

* Managing the Sponsorship Menu master (menus offered each festival year)
* Managing Contract Menu progress for each contracted menu
* Requesting production from other departments when a menu requires submission
* Collecting completed submission files
* Delivering completed submissions to relevant external parties (e.g. the printing company)

Sponsorship Menu Managers may also be Sponsorship Members.

---

## Advertisement Management Department（広告管理部門）

Responsible for:

* Changing each Contract Menu's status (production / submission progress)
* Assigning the production department of an Internal Production (委員) Contract Menu: 資料作成部門, 制作局, or SNS部門 (see Internal Production below)

Only this department changes Contract Menu status and assigns the production department (Issue #126, #127). It is a system Role, `ADVERTISEMENT_MANAGER` (see `# Roles` below). It also handles the rest of the 広告管理 screen: production type, remarks, Drive registration and upload.

Its members usually also hold `SPONSORSHIP_MEMBER`. Because it cooperates with other bureaus (e.g. the SNS部門), a person may hold `ADVERTISEMENT_MANAGER` alone.

How its responsibilities divide with the Sponsorship Menu Management Team above (which also manages Contract Menu progress and requests production) is 未決.

---

## Finance Department

Responsible for:

* Confirming payments
* Recording payment status
* Informing Sponsorship Members when payments are received

The Finance Department cannot edit sponsorship progress.

---

## System Administrator

Responsible for:

* Managing users
* Managing permissions
* Managing system configuration

---

# Roles

The canonical Role set is defined in `spec/domain.md#Role` (5 Roles: Sponsorship Member, Advisor, Finance Department, Advertisement Manager, Administrator; holding none is the view-only baseline). Advertisement Manager (`ADVERTISEMENT_MANAGER`, 広告管理部門) is the one department above that is its own Role, because Contract Menu status and production department assignment belong to it alone (Issue #126, #127). Administrator, as superuser, can do everything it can. Company Management Team and Sponsorship Menu Management Team (above) are not separate Roles — their responsibilities are covered by Sponsorship Member (company/menu master data, day-to-day ad-material management) and Administrator (Year creation, assignment, deletion — see `spec/api.md#Authorization Matrix`).

Permissions are defined in `spec/api.md#Authorization Matrix`.

---

# Business Terms

## Company

A company participating in sponsorship activities.

A company exists independently of festival years.

---

## Year

Represents one festival cycle.

Every sponsorship activity belongs to one Year.

---

## Yearly Company

Represents one company's activity during a specific festival year.

This is the central business entity of AdAdd.

A Yearly Company contains:

* Assigned member (at most one)
* Company status (Continuing / New / Dormant — relationship history)
* Sponsorship phase (Phase1 / Phase2 / Phase3 — outreach priority ranking for this Year)
* Sponsorship progress
* Activity history
* Sponsorship contracts

A Yearly Company does not have a direct advisor reference. Advisors are assigned to Sponsorship Members, and monitor company progress indirectly through the members assigned to that company.

---

## Sponsorship Contract

Represents an agreement between the festival and a company.

A Yearly Company has at most one contract (zero before it is created). The company selects one or more Sponsorship Menus, but they are bundled into a single contract — the company/organization receives one invoice and one receipt per Year, not one per menu.

---

## Sponsorship Menu

Represents one type of sponsorship benefit offered during a festival year.

This is the master definition, not a specific company's contract.

Examples include:

* Pamphlet advertisement
* Homepage banner advertisement
* Company booth

Each Sponsorship Menu defines:

* Default price
* Whether submission/production is required
* Whether it is currently offered

---

## Contract Menu

Represents one Sponsorship Menu that a company has actually contracted for, as part of a Sponsorship Contract.

A Contract Menu references exactly one Sponsorship Menu.

The management content differs by whether the referenced Sponsorship Menu requires submission. Examples:

| Sponsorship Menu       | Management Content     |
| ----------------------- | ----------------------- |
| Pamphlet advertisement (requires submission) | Submission management |
| Homepage banner advertisement (requires submission) | Submission management (banner artwork/logo) |
| Company booth (no submission) | Booth information management |

Each Contract Menu manages:

* Quantity and unit price
* Production method (when submission is required)
* Progress
* Google Drive folder
* Remarks

---

## Payment

Represents payment for a sponsorship contract.

Payments are confirmed manually by the Finance Department.

---

## Activity Log（活動記録）

Stores important business events. The operator-facing name is 活動記録.

Examples:

* Member assignment
* Material sent
* Contract confirmed
* Contract and Contract Menu changes (quantity, unit price, add / remove)
* Payment confirmed, and payment confirmation reverted
* Company contact changed

The full list is in `spec/domain.md#Activity Log`.

---

# Annual Workflow

The annual sponsorship process follows this sequence.

```text
Create Festival Year
        ↓
Copy Company Information
        ↓
Assign Advisors
        ↓
Assign Sponsorship Members
        ↓
Classify Companies
        ↓
Send Sponsorship Materials
        ↓
Receive Sponsorship Applications
        ↓
Manage Contract Menus
        ↓
Receive Payments
        ↓
Send Receipts
        ↓
Festival
        ↓
Send Thank-you Letters
        ↓
Archive Year
```

---

# Sponsorship Workflow

The standard sponsorship workflow is:

```text
Company Assignment
        ↓
Material Sent
        ↓
Company Response
        ↓
Sponsorship Confirmed
        ↓
Invoice Sent
        ↓
Contract Menu Management
        ↓
Payment Confirmed
        ↓
Receipt Sent
```

Not every company reaches the final stage.

Some companies may decline sponsorship after receiving materials.

---

# Contract Menu Workflow

Once a Sponsorship Contract is confirmed, each Contract Menu is managed according to whether its Sponsorship Menu requires submission.

```text
Contract
    ↓
Progress management per contracted Sponsorship Menu
```

Examples:

* Pamphlet advertisement → Submission management
* Homepage banner advertisement → Submission management (banner artwork/logo)
* Company booth → Booth information management

For menus that require submission (e.g. advertisements, including web-based formats such as a homepage banner), there are two production methods. The company chooses between them when submitting the Google Forms application, and the choice determines what the company is expected to submit.

## Company Production

The company creates and submits a finished, ready-to-use product (完成品) — e.g. the completed banner or advertisement artwork.

The completed files are uploaded to Google Drive.

---

## Internal Production

The company still submits something, but it is raw material (素材) — e.g. logo image, company text/copy — not a finished product.

The Sponsorship Menu Management Team requests production from another department, which uses the submitted material to create the finished product.

The business calls this production type 委員会 (UI label 委員). A Sponsorship Member sets it. Once it is set, the Advertisement Management Department assigns exactly one producing department:

* 資料作成部門
* 制作局
* SNS部門

The production type stays 委員 after the assignment; the department is a breakdown of it. Until assigned, the department is empty. Company Production cannot have a department. A Sponsorship Member cannot assign it.

The request status is managed within AdAdd.

Only the request status is tracked.

Production progress is managed externally.

---

# Business Rules

## Company

Companies persist across years.

Company information is inherited every festival year.

---

## Yearly Company

Every company participating in a festival year has one Yearly Company.

A company may exist without a sponsorship contract.

---

## Sponsorship Advisor

An Advisor is assigned to Sponsorship Members, not to Yearly Companies or Companies.

A Sponsorship Member may have multiple Advisors within the same festival year (no upper bound).

Advisors monitor sponsorship progress by reviewing the companies handled by their assigned members.

---

## Sponsorship Contract

Contracts are finalized when:

* Google Forms is submitted, or
* An agreement is reached through email or direct communication.

Google Forms is not mandatory.

---

## Sponsorship Progress

Progress belongs to the Yearly Company.

Typical progress includes:

* Not Contacted
* Materials Sent
* Sponsorship Confirmed
* Invoice Sent
* Payment Received
* Receipt Sent

Additional statuses such as "Declined" or "Pending" may also exist.

A goods-sponsorship-only contract has no payment. After Sponsorship Confirmed it moves to Goods Received (物品受領) instead of the payment stages.

Payment Received and Receipt Sent follow the Finance Department's confirmation in AdAdd. In the field the order varies: in a face-to-face contract the member brings both the invoice and the receipt and is paid on the spot; by email the receipt is usually sent after the payment is confirmed, but not always. A receipt can be prepared before confirmation, but progress is still recorded in order — Finance confirms, then Receipt Sent (`spec/domain.md` → Lifecycle → Sponsorship Progress Consistency).

---

## Sponsorship Menu

Sponsorship Menus are defined per festival Year.

A Sponsorship Menu is master data and does not belong to any single company or contract.

---

## Contract Menu

Contract Menus belong to Sponsorship Contracts.

A contract may contain multiple Contract Menus.

Each Contract Menu references exactly one Sponsorship Menu.

Submission files are stored in Google Drive.

AdAdd stores metadata only.

For goods sponsorship (物品協賛), the advertising given in exchange is an ordinary Contract Menu marked `isGoodsSponsorship`, with `unitPrice` set to `0`. This is a property of the individual Contract Menu, not the Sponsorship Menu — the same menu (e.g. a Pamphlet ad) can be sold normally in one contract and given as a goods-sponsorship return in another. The goods description and estimated value are recorded in the Sponsorship Contract's remarks (contract-wide, not per menu), entered manually (never via Google Forms).

---

## Payment

Payments belong to Sponsorship Contracts.

Only the Finance Department can update payment status.

A contract is billed once, for its total amount. What actually arrives in the bank account can differ:

* **Bank fee deducted / overpayment** — the company deducts the transfer fee, or pays more than billed. The Finance Department records the amount actually received, may still confirm the payment, and writes the reason for the difference in the payment's remarks (備考). The received amount and the remarks can be corrected after confirmation.
* **Split payment** — the company pays in several transfers. Each time money arrives, the Finance Department overwrites the received amount with the cumulative total so far. The payment is confirmed once the full amount has arrived. There is no "partially paid" status; the history of each transfer is traced through 活動記録 and the remarks.

A contract still has exactly one payment record in every case.

---

## Invoices and Receipts

The invoice (請求書) and receipt (領収書) follow these format rules (Issue #170):

* No invoice number or receipt number is issued.
* Amounts are printed as plain amounts. There is no consumption-tax breakdown.
* No revenue stamp (収入印紙) is affixed to receipts.
* Goods sponsorship (物品協賛) lines are not printed. A contract that consists only of goods sponsorship (total ¥0) gets neither an invoice nor a receipt.
* A receipt is usually sent after the Finance Department has confirmed the payment, but not always. In a face-to-face contract, the member brings both the invoice and the receipt and receives the money on the spot; the Finance Department confirms it in AdAdd afterwards. A receipt can therefore be issued before confirmation.

The issuer information (the committee's name, address, contact email) and the bank transfer account printed on the documents are kept per festival Year and are maintained by an Administrator, because they can change from one Year to the next. A new Year starts with the previous Year's values, which the Administrator then edits. The committee's seal (印影) stays as an image file in the source code repository, by the user's decision (Issue #176).

---

## Activity History

All important business operations should be recorded.

History should never be deleted.

---

# External Systems

AdAdd integrates with existing Google Workspace services.

## Google Forms

Used to collect sponsorship applications.

Forms are an input method.

They are not the source of truth.

---

## Google Drive

Stores Contract Menu submission files.

The system stores only Drive references.

---

## Google Groups

Stores email communication.

AdAdd does not synchronize email contents.

Users can search historical emails using company names.

---

## Slack

Used to notify the Sponsorship Member assigned to a company when sponsorship progress becomes Confirmed (協賛確定) — see UC-16 / FR-014. Google Forms is not imported; a human identifies the company in AdAdd first.

Each User may have a linked Slack ID.

AdAdd sends notifications to Slack. It does not read from Slack, and does not store Slack message contents.

---

# Source of Truth

MySQL is the only authoritative data source.

Google Sheets may be used for:

* Import
* Export
* Legacy workflow support

No operational data should depend on spreadsheets.

---

# Guiding Principle

AdAdd does not replace the sponsorship workflow.

AdAdd makes the workflow visible.

The system exists to help people collaborate using the same information.
