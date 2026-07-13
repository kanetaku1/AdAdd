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

Assign advisors responsible for supporting sponsorship members.

## Flow

1. Select a Sponsorship Member.
2. Select an Advisor.
3. Save.

## Result

The advisor is assigned to the member, not to a company. The advisor supervises the companies handled by that member indirectly.

---

# UC-04 Assign Sponsorship Members

## Actor

Company Management Team

## Goal

Assign members responsible for contacting companies.

## Flow

1. Select one or more Yearly Companies.
2. Assign Sponsorship Members.
3. Save.

## Result

Members receive their assigned companies.

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

The contract's assignee is not entered at step 3. By the time a contract is created, the Company Management Team or an Advisor has already assigned a Sponsorship Member to the Yearly Company (UC-04) — the contract simply carries that assignee over (see `spec/model.md#SponsorshipContract`).

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
3. For each Contract Menu, select production method (when submission is required).
4. Assign production if required.
5. Register Google Drive folder.
6. Update progress according to whether the menu requires submission (submission management for advertisements — including web-based formats such as a homepage banner — or booth information management for booths with no submission).

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

1. Confirm bank transfer.
2. Open Sponsorship Contract.
3. Register payment.
4. Notify Sponsorship Member.

## Result

Payment status becomes confirmed.

---

# UC-10 Send Receipt

## Actor

Sponsorship Member

## Goal

Send receipt after payment confirmation.

## Flow

1. Confirm payment.
2. Generate a receipt PDF from the Payment, pre-filled with the company name, amount, and `Payment.confirmedAt` (the payment confirmation date — see `spec/model.md` → Payment, FR-015).
3. Send receipt using Google Groups.
4. Update sponsorship progress.

## Result

Business process is completed.

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

The current AdAdd implementation covers step 1 (create) and step 3 (disable/re-enable), plus listing — see `spec/frontend.md` → System Administration → User List. Step 2 (assign roles) is deferred: `Role` (`spec/model.md#Role`) has no management UI yet, so users cannot yet be granted roles through AdAdd.

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
2. Open Activity History.
3. Review recorded events.

## Result

Business history is visible.

---

# UC-15 Archive Festival Year

## Actor

Company Management Team

## Goal

Complete the sponsorship cycle.

## Flow

1. Confirm all operations are completed.
2. Archive the Year.
3. Preserve all historical records.

## Result

The festival year becomes read-only.

---

# UC-16 Notify Assigned Member via Slack

## Actor

System (triggered automatically)

## Goal

Alert the Sponsorship Member(s) assigned to a company as soon as a sponsorship application arrives, so they can respond quickly.

## Trigger

* Google Forms application imported (see UC-06, FR-012)

## Flow

1. Google Forms submission is imported and a Sponsorship Contract is created or updated for a Yearly Company.
2. The system looks up the Sponsorship Members assigned to that Yearly Company (Assignment).
3. For each assigned member with a linked Slack ID, the system sends a Slack mention referencing the company and application.

## Result

Assigned members are notified without needing to check AdAdd manually.

## Notes

Slack is a notification target only. It is not read from, and message content is not stored in AdAdd (see `spec/business.md` → External Systems → Slack).

---

# UC-17 Generate Invoice

## Actor

Sponsorship Member

## Goal

Produce an invoice document to request payment from a sponsoring company.

## Flow

1. Open the Sponsorship Contract.
2. Generate an invoice PDF, pre-filled with the company's name/contact person, the contract's Contract Menus (name, quantity, unit price), and the total amount (see FR-015).
3. Adjust content if needed (e.g. remarks, payment deadline).
4. Download the PDF.
5. Send it to the company via Google Groups.
6. Update sponsorship progress to Invoice Sent.

## Result

The company receives an invoice, and sponsorship progress reflects that it was sent.

## Notes

AdAdd generates the document but does not send it — sending remains a manual step via Google Groups, consistent with `spec/business.md` → External Systems → Google Groups. There is no stored Invoice entity; the PDF is produced fresh from current Contract data each time (see FR-015).

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
