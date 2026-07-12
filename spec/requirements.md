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
* Archive completed years
* Select the active year
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
* Assign a Sponsorship Member to the contract (shared by all Contract Menus under it — see `spec/model.md` → SponsorshipContract)

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

* Sponsorship Menu management (yearly master: category, name, default price, whether submission is required, whether currently offered)
* Contract Menu management (the menus a company actually contracted for, including quantity and unit price)
* Production method selection (when submission is required)
* Progress management, varying by menu category (submission management for advertisements — including web-based formats such as a homepage banner — or booth information management for booths)
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

* Register payment confirmation
* View payment history
* Track payment status

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

* Record important operations
* Preserve history permanently
* Display historical records

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
* Contract Menu Status

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

The system shall not manage file contents.

### Related Use Cases

* UC-07
* UC-08

### Priority

Medium

---

## FR-012 Google Forms Integration

### Purpose

Import sponsorship applications.

### Description

The system shall:

* Accept data imported from Google Forms
* Create or update Sponsorship Contracts
* Preserve imported information

Google Forms is not the source of truth.

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

* Assign an Advisor to a Sponsorship Member
* Change an existing advisor assignment
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

Notify the Sponsorship Member(s) assigned to a company when a sponsorship application is received, so they can respond promptly.

### Description

The system shall:

* Allow a User to link their Slack ID
* When a Sponsorship Contract is created or updated via Google Forms import, look up the Sponsorship Members assigned to the corresponding Yearly Company (via Assignment) and send them a Slack mention

Slack is a notification target only. AdAdd does not read from Slack, and does not store Slack message contents.

### Related Use Cases

* UC-16

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

Important business operations shall be traceable through Activity Logs.

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

---

# Requirement Principles

* Every functional requirement must support one or more use cases.
* Every implementation must satisfy a functional requirement.
* New functionality requires updates to this document before implementation.
* Business requirements always take precedence over technical convenience.
