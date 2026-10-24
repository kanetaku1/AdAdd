# Use Cases

## Purpose

This document describes how each user interacts with AdAdd.

The goal is to define business behavior rather than implementation details.

Each use case represents a complete business operation.

---

# Actors

The following actors interact with the system.

* Company Management Team
* Sponsorship Member
* Sponsorship Advisor
* Sponsorship Menu Management Team
* Advertisement Management Department（広告管理部門）
* Finance Department
* System Administrator

---

# UC-01 Create Festival Year

## Actor

Company Management Team

## Goal

Create a new festival year.

## Flow

1. Create a new Year.
2. Select the previous Year.
3. Copy company information.
4. Generate Yearly Companies.
5. Start the new sponsorship cycle.

## Result

The new festival year becomes available.

## Notes

Step 3–4's Yearly Company generation computes `companyStatus` automatically — see `spec/domain.md` → Company Status for the exact rule (Continuing/New; Dormant is always a later manual reclassification, never generated here).

Yearly Company creation also happens through **Company CSV import** while a Year is active: each imported Company is registered into the active Year in the same operation (`spec/api.md#Bulk Import Companies`). This is how the first Year's companies are loaded when moving to AdAdd (`spec/operations.md#Initial Data Migration`).

A Year is never deleted (`spec/domain.md#Year`). A wrong name or period is corrected by an Administrator while the Year is active (`spec/domain.md#Correcting a Year`).

Sponsorship Menus are not copied by this flow. After the Year is created, a Sponsorship Member or Administrator may copy the previous Year's menus and then edit prices and other attributes (`spec/domain.md#Copying Menus from the Previous Year`).

Yearly Company creation also happens **individually**, outside this bulk flow, for a company discovered mid-cycle after a Year already exists (see `spec/frontend.md` → Company List — the same underlying operation as step 4, invoked once for a single Company instead of for every Company).

---

# UC-02 Classify Companies

## Actor

Company Management Team

## Goal

Prepare companies before sponsorship activities begin.

## Flow

1. Open Yearly Companies.
2. Review each company's status (Continuing / New / Dormant), referencing its past sponsorship history.
3. Set the company's sponsorship phase (Phase1 / Phase2 / Phase3) to rank outreach priority for this Year.
4. Save.

## Result

Companies are ready for assignment.

---

# UC-03 Assign Sponsorship Advisors

## Actor

Company Management Team

## Goal

Assign advisors responsible for supporting sponsorship members. A Member may have more than one Advisor at once.

## Flow

1. Select a Sponsorship Member.
2. Add an Advisor (repeatable — a Member may accumulate multiple Advisors this way), or remove one of the Member's existing Advisors.
3. Save.

## Result

Each advisor is assigned to the member individually, not to a company. Advisors supervise the companies handled by their assigned members indirectly.

---

# UC-04 Assign Sponsorship Members

## Actor

Company Management Team

## Goal

Assign the member responsible for contacting each company. A Yearly Company has at most one assignee (`CompanyAssignment`).

## Flow

1. Select one or more Yearly Companies.
2. Assign a Sponsorship Member (the same member may be applied to multiple companies in one bulk action).
3. Save.

## Result

Each selected Yearly Company now has that member as its sole assignee, replacing any previous assignee.

---

# UC-05 Send Sponsorship Materials

## Actor

Sponsorship Member

## Goal

Send sponsorship materials to assigned companies.

## Flow

1. Open assigned company.
2. Confirm company information.
3. Send materials using Google Groups.
4. Update sponsorship progress.

## Result

The company enters the sponsorship process.

---

# UC-06 Record Sponsorship Contract

## Actor

Sponsorship Member

## Goal

Register a confirmed sponsorship contract.

## Trigger

* Google Forms submitted
* Email agreement
* Face-to-face agreement

## Flow

1. Open Yearly Company.
2. Create Sponsorship Contract.
3. Enter contract details.
4. Save.

## Result

The sponsorship contract is registered.

## Notes

Goods sponsorship (物品協賛) always uses the "Email agreement" / "Face-to-face agreement" trigger and manual entry at step 3 — it is never imported from Google Forms, since the goods description and estimated value must be entered by hand (see `spec/domain.md` → Contract Menu → Goods Sponsorship).

The contract's assignee is not entered at step 3. The contract has no assignee of its own: it is always the member currently assigned to the Yearly Company (UC-04), so reassigning the company also changes who handles the contract (see `spec/model.md#SponsorshipContract`). A contract can be recorded even if nobody is assigned yet. Who recorded it is kept in 活動記録.

Regardless of trigger, entering the contract at step 3 is always a manual action performed by the Sponsorship Member: reading the submitted Google Forms response, or an email/face-to-face agreement, and transcribing it into AdAdd. Google Forms is never imported automatically (`spec/domain.md` → Google Forms is a contract input method, not the source of truth).

---

# UC-07 Manage Contract Menus

## Actor

Sponsorship Menu Management Team

## Goal

Manage the sponsorship menus contracted within a sponsorship contract.

## Flow

1. Open the Sponsorship Contract.
2. View the list of contracted Sponsorship Menus (Contract Menus).
3. For each Contract Menu, select production method (when submission is required). Sponsorship Member sets 委員 (Internal Production) here.
4. Assign production if required: for a 委員 Contract Menu, the Advertisement Management Department assigns one of 資料作成部門 / 制作局 / SNS部門 (`spec/api.md#Assign Contract Menu Production Department`).
5. Register Google Drive folder.
6. Update progress (Contract Menu status — Advertisement Management Department only, `spec/api.md#Update Contract Menu Status`) according to whether the menu requires submission (submission management for advertisements — including web-based formats such as a homepage banner — or booth information management for booths with no submission).

## Result

Each Contract Menu's assignee, progress, and Drive information is managed.

---

# UC-08 Submit Contract Menu

## Actor

Sponsorship Menu Management Team

## Goal

Record completed submission data for a Contract Menu.

## Flow

1. Confirm the Contract Menu is complete.
2. Register Drive folder.
3. Mark as submitted.

## Result

The Contract Menu is ready for the next step (e.g. printing, booth setup, or listing publication).

---

# UC-09 Confirm Payment

## Actor

Finance Department

## Goal

Record sponsorship payment.

## Flow

1. Confirm bank transfer (or, for a face-to-face contract, the money the member received on the spot).
2. Open Sponsorship Contract.
3. Record the amount actually received (`Payment.receivedAmount`; the input defaults to the billed amount). For a split payment, enter the cumulative total received so far.
4. If the received amount differs from the billed amount (bank fee deducted, overpayment), write the reason in the payment's remarks.
5. Register payment (confirm) once the full amount has arrived — or, for a bank fee deduction or overpayment, once the difference has been explained in the remarks. `receivedAmount` is required to confirm.
6. Notify Sponsorship Member.

## Result

Payment status becomes confirmed, and the Yearly Company's progress moves to 協賛金入金 automatically (if it is already 領収書送付, it is kept). The billed amount, the received amount, and their difference remain visible.

## Notes

A mistaken confirmation is reverted by moving the Payment back to waiting. If progress is 協賛金入金 or 領収書送付, it moves back to 協賛確定 automatically (`spec/domain.md` → Lifecycle → Sponsorship Progress Consistency).

A split payment stays `WAITING` until the full amount is in; each partial transfer only updates `receivedAmount`. There is no partial-payment status (`spec/domain.md#Payment`).

`receivedAmount` and remarks can still be corrected after confirmation without moving the Payment back to `WAITING`; each change is recorded in 活動記録. Moving the Payment back to `WAITING` keeps `receivedAmount`.

A receipt may already have been handed over before this use case runs (face-to-face contracts — see UC-10).

---

# UC-10 Send Receipt

## Actor

Sponsorship Member

## Goal

Send a receipt for the sponsorship payment — usually after payment confirmation, or on the spot in a face-to-face contract.

## Flow

By email (usual case):

1. Confirm payment.
2. Generate a receipt PDF from the Payment, pre-filled with the company name, `Payment.receivedAmount`, and `Payment.confirmedAt` (the payment confirmation date — see `spec/model.md` → Payment, FR-015).
3. Send receipt using Google Groups.
4. Update sponsorship progress.

Face-to-face contract:

1. Generate the invoice and a receipt PDF while the Payment is still `WAITING`. The amount defaults to the billed amount; the payment date has no default and is entered manually.
2. Bring both to the company and receive the money on the spot.
3. Hand over the receipt.
4. The Finance Department confirms the received money in AdAdd afterwards (UC-09).

## Result

Business process is completed.

## Notes

A receipt can be generated from a `WAITING` or a `CONFIRMED` Payment (FR-015 → Receipt Timing). This replaces the earlier "`CONFIRMED` only" rule (Issue #159). A goods-sponsorship-only contract (`totalAmount = 0`) has no Payment and gets no receipt.

The receipt has no receipt number, no consumption-tax breakdown, and no revenue stamp field (FR-015 → Document Format). The issuer information is read from the Contract's Year; the seal image stays in the repository (`apps/web/public/images/43rd_Stamp.png`).

---

# UC-11 View Progress

## Actor

Sponsorship Advisor

## Goal

Monitor assigned sponsorship members.

## Flow

1. Open dashboard.
2. View assigned members.
3. Review sponsorship progress.
4. Identify delayed companies.

## Result

Advisors understand current progress.

---

# UC-12 Manage Users

## Actor

System Administrator

## Goal

Manage system users.

## Flow

1. Create users.
2. Assign roles.
3. Disable users if necessary.

## Result

System permissions remain up to date.

## Notes

The current AdAdd implementation covers all three steps — creation, role assignment, and disable/re-enable — plus listing, via a single screen: see `spec/frontend.md` → Settings → User List.

---

# UC-13 Search Companies

## Actor

All Internal Users

## Goal

Find company information quickly.

## Flow

1. Search by company name.
2. Open Yearly Company.
3. View contracts, advertisements, payments and activity history.

## Result

All related information is available from one place.

---

# UC-14 View Activity History

## Actor

All Internal Users

## Goal

Understand past business activities.

## Flow

1. Open Yearly Company.
2. Open 活動記録.
3. Review recorded events (system-generated only — progress and other status changes, assignment, contract and Contract Menu changes, payment confirmation and its revert, contact changes; no manual entry — see `spec/domain.md#Activity Log`).

## Result

Business history is visible. A handover note that isn't itself one of those recorded changes belongs on `Company.memo`, not 活動記録.

---

# UC-15 Archive Festival Year

## Actor

Administrator (by creating the next Year)

## Goal

Complete the sponsorship cycle.

## Flow

1. Create the next Year (UC-01).
2. Every earlier Year becomes a past Year automatically.
3. The Finance Department keeps confirming the past Year's remaining Payments as transfers arrive (UC-09).

## Result

The past Year is read-only except payment confirmation (`spec/domain.md#Active Year and Past Years`). All historical records are preserved and can be viewed.

## Notes

There is no separate archive action. Before creating the next Year, finish any change other than payment confirmation in the current Year — contracts, contract menus, and assignments can no longer be changed afterwards. The past Year's own name and period can no longer be corrected either (`spec/domain.md#Correcting a Year`).

---

# UC-16 Notify Assigned Member via Slack

## Actor

System (triggered automatically)

## Goal

Alert the Sponsorship Member assigned to a Yearly Company when sponsorship is confirmed, so they can proceed (invoice, menus) without matching Google Forms company names to AdAdd.

## Trigger

* `YearlyCompany.progress` transitions to Confirmed (`CONFIRMED` / 協賛確定) from any other value

This happens when:

* A Sponsorship Member sets progress to 協賛確定 (`PATCH /yearly-companies/{id}/progress`)
* A Sponsorship Contract is created (side effect: progress becomes Confirmed) — the usual path after reading a Google Forms response or an email/face-to-face agreement (UC-06)

Google Forms is not imported automatically. A human identifies the Yearly Company in AdAdd first, so Slack never depends on matching a Forms company name to `Company.companyName`.

## Flow

1. Progress becomes Confirmed.
2. If previous progress was already Confirmed, stop (no duplicate mention).
3. Look up the Sponsorship Member assigned to that Yearly Company (`CompanyAssignment`).
4. If a member is assigned and has a linked Slack ID, send a Slack mention with the company name.

## Result

The assigned member is mentioned in the configured Slack channel.

## Notes

Slack is a notification target only. It is not read from, and message content is not stored in AdAdd (see `spec/business.md` → External Systems → Slack).

A Slack failure must not fail the progress update or contract create. If Slack is not configured (`SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` unset), the write still succeeds and no mention is sent.

---

# UC-17 Generate Invoice

## Actor

Sponsorship Member

## Goal

Produce an invoice document to request payment from a sponsoring company.

## Flow

1. Open the Sponsorship Contract.
2. Generate an invoice PDF, pre-filled with the company's name/contact person, the contract's paid Contract Menus (name, quantity, unit price — goods sponsorship lines are left out), and the total amount (see FR-015).
3. Adjust content if needed (e.g. remarks, payment deadline).
4. Download the PDF.
5. Send it to the company via Google Groups.
6. Update sponsorship progress to Invoice Sent.

## Result

The company receives an invoice, and sponsorship progress reflects that it was sent.

## Notes

AdAdd generates the document but does not send it — sending remains a manual step via Google Groups, consistent with `spec/business.md` → External Systems → Google Groups. There is no stored Invoice entity; the PDF is produced fresh from current Contract data each time (see FR-015).

A goods-sponsorship-only contract (`totalAmount = 0`) gets no invoice. The invoice has no invoice number and no consumption-tax breakdown. The issuer information and the bank transfer account are read from the Contract's Year (`spec/model.md#Year`), not from constants in the frontend (FR-015 → Document Format).

---

# Use Case Relationships

```text id="c98fr8"
Create Year
      ↓
Classify Companies
      ↓
Assign Advisors
      ↓
Assign Members
      ↓
Send Materials
      ↓
Create Contract
      ↓
Generate Invoice
      ↓
Manage Contract Menus
      ↓
Confirm Payment
      ↓
Send Receipt
      ↓
Archive Year
```

---

# Design Principle

Every feature implemented in AdAdd should support at least one use case defined in this document.

If a new feature does not satisfy an existing use case, a new use case should be created before implementation.

Business behavior always takes precedence over implementation convenience.
