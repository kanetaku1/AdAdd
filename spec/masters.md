# Master Data

## Purpose

This document lists the master data managed within AdAdd.

Master data is data that is configured and maintained through operations, rather than generated as a byproduct of a single business transaction.

Distinguishing master data from transactional data helps implementers (including AI) understand:

* What must be editable through an admin/management screen.
* What must never be hardcoded.
* What changes rarely, and what changes as part of daily operations.

---

# What Counts as Master Data

A concept is master data if it satisfies at least one of the following:

* It is referenced by many transactional records (e.g. a Sponsorship Menu is referenced by many Contract Menus).
* It is configured by an operator before the season/year starts, not created as a side effect of a sponsorship activity.
* Its definition can change from year to year, but individual instances must remain stable once referenced.

Master data is distinct from:

* **Value Objects / Enumerations** defined at the code level (e.g. `PaymentStatus`), which rarely change and do not need an admin UI.
* **Transactional entities** (e.g. `SponsorshipContract`, `ContractMenu`, `Payment`), which are created and updated as business activities occur.

Some enumerations listed below started as fixed value objects but are documented here because they are strong candidates to become operator-managed master data as the system matures.

---

# Master Data List

## Sponsorship Menu

### Definition

The set of sponsorship benefits offered during a specific festival Year (e.g. Pamphlet advertisement, Company booth, Website listing).

### Scope

Per Year. Defined before sponsorship activities begin, referenced throughout the year by Contract Menus.

### Maintained By

Sponsorship Menu Management Team.

### Referenced By

`ContractMenu.sponsorshipMenuId`

### Source

See `spec/model.md` → `SponsorshipMenu`, `spec/domain.md` → Sponsorship Menu aggregate.

### Notes

Once a Sponsorship Menu is referenced by a Contract Menu, its identity must remain stable for that Year. New Years get their own set of Sponsorship Menus — menus are not shared or mutated across years.

---

## Role

### Definition

The set of permission roles a User can hold (e.g. Sponsorship Member, Sponsorship Advisor, Company Management Team, Sponsorship Menu Management Team, Finance Department, System Administrator).

### Scope

Global. Not scoped to a Year.

### Maintained By

System Administrator.

### Referenced By

`User` (via role assignment), `Assignment.role`

### Source

See `spec/model.md` → `Role`, `spec/business.md` → Roles.

---

## Department (Organizational Group)

### Definition

The organizational teams involved in sponsorship operations (Company Management Team, Sponsorship Members, Sponsorship Advisors, Sponsorship Menu Management Team, Finance Department, System Administrator).

### Scope

Global.

### Maintained By

System Administrator.

### Notes

Currently represented through `Role` rather than a dedicated entity — a User's assigned Role effectively identifies their Department. If departments and permission roles diverge in the future (e.g. one department needing multiple permission levels), this should be split into its own master table. See `spec/business.md` → Organization.

---

## Company Phase

### Definition

The classification of a company's ongoing relationship with the festival (e.g. Continuing, New, Dormant, Priority).

### Scope

Global enumeration, applied per Yearly Company.

### Maintained By

Company Management Team.

### Referenced By

`YearlyCompany.phase`

### Source

See `spec/model.md` → `CompanyPhase`.

---

## Sponsorship Progress

### Definition

The stages a Yearly Company's sponsorship activity moves through (e.g. Not Contacted, Materials Sent, Sponsorship Confirmed, Invoice Sent, Payment Received, Receipt Sent, Declined, Pending).

### Scope

Global enumeration, applied per Yearly Company.

### Maintained By

Company Management Team / Sponsorship Advisors (definition); Sponsorship Members (day-to-day updates).

### Referenced By

`YearlyCompany.progress`

### Source

See `spec/model.md` → `SponsorshipProgress`, `spec/business.md` → Sponsorship Progress.

---

## Sponsorship Menu Category

### Definition

The category a Sponsorship Menu belongs to (e.g. Advertisement, Booth, WebListing). Determines what kind of progress management a Contract Menu needs.

### Scope

Global enumeration, applied per Sponsorship Menu.

### Maintained By

Sponsorship Menu Management Team.

### Referenced By

`SponsorshipMenu.category`

### Source

See `spec/model.md` → `SponsorshipMenuCategory`.

---

## Contract Menu Status / Production Type

### Definition

The progress states (`Waiting`, `Requested`, `Producing`, `Completed`, `Submitted`) and production methods (`Company`, `Internal`) a Contract Menu moves through.

### Scope

Global enumeration, applied per Contract Menu.

### Maintained By

Sponsorship Menu Management Team.

### Referenced By

`ContractMenu.status`, `ContractMenu.productionType`

### Source

See `spec/model.md` → `ContractMenuStatus`, `ContractMenuProductionType`.

---

## Payment Status

### Definition

The states a Payment moves through (`Waiting`, `Confirmed`).

### Scope

Global enumeration, applied per Payment.

### Maintained By

Finance Department.

### Referenced By

`Payment.status`

### Source

See `spec/model.md` → `PaymentStatus`.

---

# Design Principle

Master data must be editable by the responsible department without a code change.

Transactional entities should reference master data by ID, never duplicate its attributes.

When a new operationally-managed concept is introduced, first check this document to see if it already exists before adding a new one.
