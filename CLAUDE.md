# CLAUDE.md

## About this Project

AdAdd is a Sponsor Collaboration Platform developed for the Nagaoka University of Technology Festival (技大祭).

The system manages sponsorship operations throughout an entire festival cycle.

This is a **business management system**, not an automation platform.

The primary goal is to centralize business information while preserving the existing operational workflow.

---

# Core Principles

When contributing to this project, always follow these principles.

## 1. Business First

Business requirements always take priority over implementation.

Do not change the workflow to simplify implementation.

The system must support the business.

---

## 2. Design Before Code

Never implement features before the design has been finalized.

The development order is:

```text
Business
    ↓
Requirements
    ↓
Domain
    ↓
Architecture
    ↓
Implementation
```

If the design changes, update the specification before modifying the code.

---

## 3. Documentation First

Every important decision must be reflected in the documentation.

The specification inside the `spec/` directory is the Single Source of Truth.

Code must follow the specification.

---

## 4. Domain Driven Design

This project is designed around business domains.

Avoid thinking in terms of database tables first.

Instead, understand the business concepts.

Important domain objects include:

* Year
* Company
* Yearly Company
* Sponsorship Contract
* Sponsorship Menu
* Contract Menu
* Payment
* Activity Log

---

## 5. AI Driven Development

AI is used as a development partner.

Generated code must follow the project specification.

Never invent business rules.

When information is missing:

* Ask for clarification.
* Do not make assumptions.

---

# Single Source of Truth

The following order defines the authority of information.

1. spec/
2. Source Code
3. Comments

If conflicts exist, follow the specification.

---

# Business Rules

## Yearly Company

A company exists independently of a festival year.

A Yearly Company represents one company's activity during a specific festival year.

Business progress belongs to the Yearly Company.

---

## Sponsorship Contract

A contract belongs to a Yearly Company.

A Yearly Company has at most one contract (zero before it is created). Multiple Sponsorship Menus may be bundled into that single contract — the company/organization is invoiced and receipted once per Year, not once per menu.

A company may be contacted without creating a contract.

---

## Sponsorship Menu

A Sponsorship Menu is master data defined per festival Year (e.g. Pamphlet advertisement, Homepage banner advertisement, Company booth).

A Sponsorship Menu never belongs to a specific company or contract.

---

## Contract Menu

A Contract Menu belongs to a Sponsorship Contract and references exactly one Sponsorship Menu.

Contract Menu files are stored in Google Drive.

The system stores only metadata and Drive references.

---

## Payment

Payments belong to Sponsorship Contracts.

The Finance Department confirms payments manually.

No banking integration exists.

---

## Email

Emails are managed through Google Groups.

The system does not store email contents.

---

## Google Forms

Google Forms is a contract input method.

It is not the source of truth.

MySQL is always the source of truth.

---

# System Scope

The system manages:

* Company Management
* Yearly Company Management
* Sponsorship Contracts
* Sponsorship Menus
* Payments
* Activity Logs
* Permissions
* Invoice and Receipt PDF generation (on-demand, from existing Contract/Payment data — see FR-015)

The system does NOT manage:

* Email delivery
* Advertisement creation
* AI assistant
* Accounting

Invoice/Receipt PDF generation is a narrow exception to "no PDF generation": it produces a downloadable document from data already in AdAdd, on demand, for the user to send manually (e.g. via Google Groups). It does not generate advertisement artwork, and AdAdd does not send the document itself.

---

# Architecture Principles

* Keep business logic inside the backend.
* Avoid business logic in the frontend.
* Prefer explicit naming.
* Avoid abbreviations.
* Keep domain terminology consistent.

---

# Database Principles

MySQL is the Single Source of Truth.

Google Sheets are only used for:

* Import
* Export
* Legacy workflow support

Never treat spreadsheets as the primary database.

---

# Naming Rules

Use explicit names.

Good:

* YearlyCompany
* SponsorshipContract
* SponsorshipMenu
* ContractMenu
* ActivityLog

Bad:

* YC
* ContractData
* AdvInfo

---

# Before Writing Code

Before implementing any feature, verify:

* Business requirements exist.
* Domain model exists.
* API has been designed.
* Database model has been designed.

If not, stop and update the specification first.

---

# Decision Making

When proposing changes:

1. Explain the business reason.
2. Explain the design impact.
3. Explain the implementation impact.

Business consistency is more important than implementation convenience.

---

# Communication Style

When assisting with development:

* Explain design decisions.
* Prefer maintainability over clever solutions.
* Avoid unnecessary complexity.
* Recommend simple and explicit implementations.

When uncertain, ask questions rather than making assumptions.
