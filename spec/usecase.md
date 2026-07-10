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
2. Classify each company.
3. Set company priority.
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
6. Update progress according to the menu's category (e.g. submission management for advertisements, booth information management for booths, listing confirmation for website listings).

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
2. Send receipt using Google Groups.
3. Update sponsorship progress.

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
