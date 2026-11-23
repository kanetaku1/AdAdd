# Vision

## Project

**AdAdd**

**Sponsor Collaboration Platform**

---

# Mission

AdAdd is a platform that supports sponsorship operations for the Nagaoka University of Technology Festival (技大祭).

The mission of AdAdd is to centralize sponsorship information, improve collaboration across departments, and reduce operational complexity while preserving existing business workflows.

---

# Vision

Create a single platform where every stakeholder involved in sponsorship management can access accurate, up-to-date information throughout the entire festival cycle.

AdAdd eliminates fragmented information management while maintaining the flexibility required by student-led organizations.

---

# Why AdAdd?

Current sponsorship operations rely on multiple independent tools:

* Google Sheets
* Google Drive
* Google Groups
* Manual communication

These tools work individually but lack a unified view of the sponsorship process.

As a result:

* Information is duplicated.
* Progress is difficult to track.
* Responsibilities become unclear.
* Knowledge is difficult to inherit between years.

AdAdd solves these problems by providing a centralized platform while integrating with existing tools rather than replacing them.

---

# Goals

## Centralized Information

Provide one place where sponsorship-related information can be managed consistently.

---

## Business Visibility

Allow every department to understand the current status of sponsorship activities.

---

## Collaboration

Improve communication between:

* Sponsorship Members（協賛メンバー）
* Sponsorship Advisors（アドバイザー）
* Advertisement Management Department（広告管理部門）
* Finance Department（財務局）
* System Administrators（管理者）

---

## Continuity

Support yearly transitions by preserving organizational knowledge and historical records.

---

## Maintainability

Provide a clean architecture that allows future members to continue development.

---

# Design Philosophy

The following principles guide all design decisions.

## Business First

Business requirements are always prioritized over technical convenience.

---

## Documentation First

Specifications are written before implementation.

Documentation is considered part of the product.

---

## Domain Driven Design

The business domain defines the software architecture.

Database tables and UI are derived from the domain model.

---

## Single Source of Truth

MySQL is the authoritative data source.

Other services synchronize with the system but never replace it.

---

# Scope

AdAdd manages the sponsorship lifecycle.

The scope includes:

* Company Management
* Yearly Company Management
* Sponsorship Progress
* Sponsorship Contracts
* Advertisement Management
* Payment Management
* Activity History
* Permission Management
* Invoice/Receipt PDF Generation (on-demand, from existing data — see FR-015)

---

# Out of Scope

The following responsibilities remain outside the system:

* Sending emails
* Creating advertisements
* Accounting
* AI assistants
* Banking integration

These operations continue to use existing workflows.

---

# Target Users

Primary users include:

* Sponsorship Members（協賛メンバー）— SPONSORSHIP_MEMBER role
* Sponsorship Advisors（アドバイザー）— ADVISOR role
* Advertisement Managers（広告管理部門）— ADVERTISEMENT_MANAGER role
* Finance Department（財務局）— FINANCE_DEPARTMENT role
* System Administrators（管理者）— ADMINISTRATOR role

A user may hold multiple roles.

---

# Success Criteria

AdAdd succeeds when:

* Every sponsorship-related record can be found from a single platform.
* Every department shares the same information.
* Historical sponsorship data can be inherited every year.
* Manual management using spreadsheets is significantly reduced.
* New members can understand the business process without relying on verbal knowledge transfer.

---

# Long-Term Vision

AdAdd is designed as a long-term platform for sponsorship management.

The architecture should remain extensible so that future functionality can be added without changing the core domain model.

The project values long-term maintainability over short-term implementation speed.
