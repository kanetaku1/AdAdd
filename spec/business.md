# Business

## Business Overview

AdAdd supports the sponsorship operations of the Nagaoka University of Technology Festival (技大祭).

The system centralizes business information while preserving the existing operational workflow.

Sponsorship operations span an entire festival cycle and involve multiple departments working together.

AdAdd provides a shared platform where every stakeholder can access the same information.

---

# Organization

The sponsorship organization consists of several departments.

## Company Management Team

Responsible for:

* Managing company information
* Assigning Sponsorship Advisors to Sponsorship Members
* Assigning Sponsorship Members to companies
* Classifying companies
* Determining company priorities

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

The system provides the following roles.

* General Member
* Sponsorship Member
* Sponsorship Advisor
* Company Management Team
* Sponsorship Menu Management Team
* Finance Department
* System Administrator

Permissions are defined separately.

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

* Assigned members
* Company classification
* Priority
* Sponsorship progress
* Activity history
* Sponsorship contracts

A Yearly Company does not have a direct advisor reference. Advisors are assigned to Sponsorship Members, and monitor company progress indirectly through the members assigned to that company.

---

## Sponsorship Contract

Represents an agreement between the festival and a company.

A Yearly Company may have zero or multiple contracts.

---

## Sponsorship Menu

Represents one type of sponsorship benefit offered during a festival year.

This is the master definition, not a specific company's contract.

Examples include:

* Pamphlet advertisement
* Company booth
* Website listing

Each Sponsorship Menu defines:

* Category
* Default price
* Whether submission/production is required
* Whether it is currently offered

---

## Contract Menu

Represents one Sponsorship Menu that a company has actually contracted for, as part of a Sponsorship Contract.

A Contract Menu references exactly one Sponsorship Menu.

The management content differs by menu category. Examples:

| Sponsorship Menu       | Management Content     |
| ----------------------- | ----------------------- |
| Pamphlet advertisement   | Submission management   |
| Company booth            | Booth information management |
| Website listing          | Listing confirmation    |

Each Contract Menu manages:

* Production method (when submission is required)
* Progress
* Google Drive folder
* Assignee
* Remarks

---

## Payment

Represents payment for a sponsorship contract.

Payments are confirmed manually by the Finance Department.

---

## Activity Log

Stores important business events.

Examples:

* Member assignment
* Material sent
* Contract confirmed
* Payment confirmed

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

Once a Sponsorship Contract is confirmed, each Contract Menu is managed according to its Sponsorship Menu category.

```text
Contract
    ↓
Progress management per contracted Sponsorship Menu
```

Examples:

* Pamphlet advertisement → Submission management
* Company booth → Booth information management
* Website listing → Listing confirmation

For menus that require submission (e.g. advertisements), there are two production methods.

## Company Production

The company creates the submission.

The completed files are uploaded to Google Drive.

---

## Internal Production

The Sponsorship Menu Management Team requests production from another department.

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

A Sponsorship Member has at most one Advisor per festival year.

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

---

## Payment

Payments belong to Sponsorship Contracts.

Only the Finance Department can update payment status.

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
