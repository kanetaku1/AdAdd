# Requirements

## Purpose

This document defines the functional and non-functional requirements of AdAdd.

Requirements describe **what the system must provide**.

Implementation details are intentionally excluded.

---

# Functional Requirements

## FR-001 Festival Year Management

### Purpose

Manage each festival year independently.

### Description

The system shall allow administrators to:

* Create a new festival year
* Correct the active year's name and period (a year is never deleted — `spec/domain.md#Correcting a Year`)
* Archive completed years — automatic: creating a new Year makes every earlier Year a past Year (`spec/domain.md#Active Year and Past Years`)
* Keep exactly one active year — the most recently created one; a past Year never becomes active again
* View past years, read-only, except payment confirmation
* Copy company data from previous years

### Related Use Cases

* UC-01
* UC-15

### Priority

High

---

## FR-002 Company Management

### Purpose

Manage permanent company information.

### Description

The system shall provide:

* Company registration
* Company editing
* Company search
* Company history

### Related Use Cases

* UC-02
* UC-13

### Priority

High

---

## FR-003 Yearly Company Management

### Purpose

Manage company information specific to one festival year.

### Description

The system shall support:

* Company classification
* Priority management
* Sponsorship progress
* Sponsorship member assignment

A Yearly Company does not store a direct reference to an Advisor. See FR-013 for advisor assignment.

### Related Use Cases

* UC-02
* UC-04
* UC-11

### Priority

High

---

## FR-004 Sponsorship Contract Management

### Purpose

Manage sponsorship contracts.

### Description

The system shall allow users to:

* Register contracts
* Edit contracts
* View contract history
* Calculate contract totals (sum of quantity × unit price across the contract's Contract Menus)
* Show the contract's Sponsorship Member — always the Yearly Company's current assignment, shared by all Contract Menus under it; the contract stores no assignee of its own (`spec/model.md#SponsorshipContract`)
* Register a contract even when no Sponsorship Member is assigned yet
* Keep sponsorship progress consistent with the contract and payment, enforced by the server (`spec/domain.md` → Lifecycle → Sponsorship Progress Consistency)
* Support contracts whose content originates from manual entry rather than Google Forms (e.g. goods sponsorship — 物品協賛)

### Related Use Cases

* UC-06

### Priority

High

---

## FR-005 Sponsorship Menu Management

### Purpose

Manage sponsorship menus, both as yearly master data and as concrete items contracted by companies.

### Description

The system shall provide:

* Sponsorship Menu management (yearly master: name, default price, whether submission is required, whether currently offered)
* Copying the previous year's Sponsorship Menus into a new year on demand, then editing them (not automatic — `spec/domain.md#Copying Menus from the Previous Year`)
* Contract Menu management (the menus a company actually contracted for, including quantity and unit price). A menu that is not currently offered cannot be newly added to a contract.
* Production method selection (when submission is required)
* Progress management, varying by whether the menu requires submission (submission management for advertisements — including web-based formats such as a homepage banner — or booth information management for booths with no submission)
* Google Drive linkage

### Related Use Cases

* UC-07
* UC-08

### Priority

High

---

## FR-006 Payment Management

### Purpose

Manage sponsorship payments.

### Description

The system shall allow Finance Department users to:

* Register payment confirmation, and revert it to correct a mistake
* Record the amount actually received (`Payment.receivedAmount`, 実入金額), separately from the billed amount (`Payment.amount`, the contract total)
* Record the reason for a difference between the two in the payment's remarks (`Payment.remarks`, 備考)
* View payment history
* Track payment status

Progress always matches the payment status. Confirming a payment moves the Yearly Company's progress to 協賛金入金 automatically (領収書送付 is kept); reverting it moves 協賛金入金 / 領収書送付 back to 協賛確定. 協賛金入金 and 領収書送付 cannot be set by hand before the payment is confirmed. A goods-only contract, which has no payment, uses 物品受領 instead (`spec/domain.md` → Lifecycle → Sponsorship Progress Consistency).

A Payment may be confirmed even when the received amount differs from the billed amount (bank fee deducted, overpayment). The difference is shown, not blocked. A split payment is recorded by overwriting `receivedAmount` with the cumulative total each time money arrives, and the Payment is confirmed once the full amount has arrived — there is no partial-payment status (`spec/domain.md#Payment`).

`receivedAmount` is required to confirm a Payment; the input defaults to the billed amount. `receivedAmount` and `remarks` stay editable after confirmation, without moving the Payment back to Waiting, and every change is recorded in 活動記録. Moving a Payment back to Waiting keeps `receivedAmount`.

### Related Use Cases

* UC-09

### Priority

High

---

## FR-007 Activity History

### Purpose

Record business history.

### Description

The system shall:

* Record important operations automatically, with no manual entry point:
  * progress, company status, and phase changes (including automatic progress changes)
  * member assignment
  * contract creation and contract edits
  * Contract Menu add / remove, quantity and unit price changes, and status changes
  * payment confirmation, payment confirmation revert, and changes to the payment's actual received amount or remarks
  * company contact information changes
* Record an operation only when a value actually changes
* Preserve history permanently
* Display historical records

The event types are listed in `spec/api.md#List Activity Logs for a Yearly Company`.

### Related Use Cases

* UC-14

### Priority

Medium

---

## FR-008 User Management

### Purpose

Manage system users.

### Description

The system shall support:

* User registration
* Role assignment
* User activation
* User deactivation

Implementation status: registration, listing, and activation/deactivation are implemented (`/users`). Role assignment is not yet implemented — see `spec/usecase.md` UC-12 Notes.

### Related Use Cases

* UC-12

### Priority

Medium

---

## FR-009 Permission Management

### Purpose

Restrict system operations according to user roles.

### Description

The system shall enforce Role-Based Access Control (RBAC).

Permissions shall depend on the assigned role.

### Related Use Cases

* UC-12

### Priority

High

---

## FR-010 Search

### Purpose

Quickly locate business information.

### Description

Users shall be able to search by:

* Company name
* Sponsorship Member
* Advisor
* Sponsorship Progress
* Contract existence (has contract / no contract)

Search quality requirements:

* Company name search shall support typo-tolerant / similar-term matching, not only exact substring matching, so users can find records that browser `Ctrl+F` would miss.
* For Yearly Company operations (about 20 members, about 500 companies), filtering UX shall prioritize exploratory narrowing (multi-condition faceted filtering) over single long selector operations.

### Related Use Cases

* UC-13

### Priority

Medium

---

## FR-011 Google Drive Integration

### Purpose

Reference Contract Menu submission files stored in Google Drive.

### Description

The system shall:

* Store Drive Folder IDs
* Open Drive folders
* Display uploaded file status

The system shall not manage file contents. Drive files are referenced via `PATCH /contract-menus/{id}/production` and `POST /contract-menus/{id}/drive-upload` — there is no separate Integration Drive-link API.

### Related Use Cases

* UC-07
* UC-08

### Priority

Medium

---

## FR-012 Google Forms Integration

### Purpose

Treat Google Forms as a contract input method, not a source of truth.

### Description

The system shall:

* Allow a Sponsorship Member to record a Sponsorship Contract after reading a Google Forms response (manual transcription, UC-06)
* Not import Google Forms automatically — Forms company names often do not match Company master names, so a human identifies the Yearly Company in AdAdd

Automatic Forms import (`POST /integrations/google/forms/import`) is a Future Extension (`spec/api.md#Future Extensions`).

Google Forms is not the source of truth. MySQL is.

### Related Use Cases

* UC-06

### Priority

Medium

---

## FR-013 Advisor Assignment

### Purpose

Assign Sponsorship Advisors to Sponsorship Members.

### Description

The system shall allow the Company Management Team to:

* Assign one or more Advisors to a Sponsorship Member (a Member may have multiple Advisors at once, no upper bound)
* Remove an existing advisor assignment
* View the members supervised by a given Advisor
* View the companies handled by an Advisor's assigned members

An Advisor shall never be assigned directly to a Yearly Company.

### Related Use Cases

* UC-03

### Priority

High

---

## FR-014 Slack Notification

### Purpose

Notify the Sponsorship Member assigned to a company when sponsorship is confirmed, so they can proceed without relying on Google Forms name matching.

### Description

The system shall:

* Allow a User to link their Slack ID (User List / CSV — already implemented)
* When `YearlyCompany.progress` transitions to Confirmed (`CONFIRMED`), look up the Sponsorship Member assigned to that Yearly Company (`CompanyAssignment`) and send them a Slack mention with the company name

Confirmed is reached by setting progress to 協賛確定, or as a side effect of creating a Sponsorship Contract (UC-06). A transition from Confirmed to Confirmed must not send another mention.

There is no Slack REST resource in AdAdd — sending is a side effect of those writes (`spec/api.md#Update Sponsorship Progress`, `#Create Sponsorship Contract`). Slack failure must not fail the write.

Slack is a notification target only. AdAdd does not read from Slack, and does not store Slack message contents.

### Related Use Cases

* UC-16

### Priority

Medium

---

## FR-015 Invoice and Receipt Generation

### Purpose

Reduce manual document creation by generating invoice and receipt PDFs directly from data already in AdAdd.

### Description

The system shall:

* Allow a Sponsorship Member to generate an invoice (請求書) PDF from a Sponsorship Contract whose `totalAmount > 0`, on demand, pre-filled with the company's name/contact person, the contract's paid Contract Menus (name/quantity/unit price), and the total amount
* Allow a Sponsorship Member to generate a receipt (領収書) PDF from a Payment — `WAITING` or `CONFIRMED` — on demand, pre-filled with the company's name, the amount, and (when `CONFIRMED`) the payment confirmation date (`Payment.confirmedAt`). See Receipt Timing below
* Allow the pre-filled content to be edited before download (e.g. remarks, payment deadline)
* Produce a downloadable PDF file — AdAdd does not send it; sending remains a manual step via Google Groups (see UC-17, UC-10)

Generated documents are not persisted — each is produced fresh from the current Contract/Payment/Company/Year data, and there is no stored Invoice/Receipt entity (see `spec/domain.md`).

### Document Format

Decided in Issue #170:

* **No numbering.** Neither the invoice nor the receipt carries a document number.
* **No consumption-tax breakdown.** Only amounts are printed — no tax rate, tax amount, or tax-included/excluded split.
* **No revenue stamp.** The receipt has no revenue stamp (収入印紙) field.
* **Goods sponsorship lines are not printed.** Contract Menus with `isGoodsSponsorship = true` are left out of the invoice line items. A contract whose `totalAmount` is `0` (goods-sponsorship-only) gets no invoice, and — having no Payment — no receipt.
* **Issuer information and bank transfer account come from the Year.** The committee name, postal code, address, contact email, and bank transfer account are read from the Contract's Year (`spec/model.md#Year`), maintained by an Administrator in the UI. They are not hard-coded in the frontend, so a change does not require a redeploy. If a required field is empty, generation is blocked and the UI lists the missing fields (`spec/model.md#Year` → required fields).
* **The seal image (印影) stays in the repository.** The receipt keeps using `apps/web/public/images/43rd_Stamp.png`, as today. No seal-image management feature is built. This was the user's decision on Issue #176: the seal is not moved out of the public repository (the bank account is — see above).

### Receipt Timing

This replaces the earlier "receipt only from a `CONFIRMED` Payment" rule (Issue #159).

In face-to-face contracts, the member brings both the invoice and the receipt and receives the money on the spot. By email, the receipt is usually sent after payment confirmation, but not always. A receipt can therefore be generated while the Payment is still `WAITING`; the Finance Department confirms the received money in AdAdd afterwards (UC-09).

| Payment status | Amount (default, editable) | Payment date (入金日) |
| -------------- | -------------------------- | --------------------- |
| `CONFIRMED`    | `Payment.receivedAmount`   | defaults to `Payment.confirmedAt` |
| `WAITING`      | `Payment.amount` (billed amount) | no default — must be entered manually |

The amount is editable in the generation dialog in both cases. When a `WAITING` Payment already has a `receivedAmount` (part of a split payment), whether the default should be that value instead of the billed amount is **TBD**.

A contract with `totalAmount = 0` (goods-sponsorship-only) has no Payment and still gets neither an invoice nor a receipt.

### Related Use Cases

* UC-17
* UC-10

### Priority

Medium

---

# Non-Functional Requirements

## NFR-001 Availability

The system should be available whenever committee members perform sponsorship activities.

---

## NFR-002 Performance

Common operations should complete within two seconds under normal usage.

---

## NFR-003 Security

Authentication and authorization shall be enforced for every protected resource.

---

## NFR-004 Maintainability

The codebase shall follow the documented architecture and naming conventions.

---

## NFR-005 Scalability

The architecture shall support future expansion without major redesign.

---

## NFR-006 Reliability

MySQL shall be the Single Source of Truth.

No external service shall become the authoritative data source.

---

## NFR-007 Auditability

Important business operations shall be traceable through Activity Logs. The operations in scope are those listed in FR-007.

---

# Requirement Traceability

| Feature              | Use Cases            |
| -------------------- | --------------------- |
| Festival Year        | UC-01, UC-15           |
| Company              | UC-02, UC-13           |
| Yearly Company       | UC-02, UC-04, UC-11    |
| Sponsorship Contract | UC-06                  |
| Sponsorship Menu     | UC-07, UC-08           |
| Payment              | UC-09                  |
| Activity History     | UC-14                  |
| User Management      | UC-12                  |
| Advisor Assignment   | UC-03                  |
| Slack Notification   | UC-16                  |
| Invoice/Receipt Generation | UC-17, UC-10     |

---

# Requirement Principles

* Every functional requirement must support one or more use cases.
* Every implementation must satisfy a functional requirement.
* New functionality requires updates to this document before implementation.
* Business requirements always take precedence over technical convenience.
