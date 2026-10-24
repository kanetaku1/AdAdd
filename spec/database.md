# Entity Relationship Design

## Purpose

This document defines the relationships between entities in AdAdd.

The ER design represents business relationships and does not describe database implementation details.

---

# ER Overview

```text
                         Year
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
  YearlyCompany                    SponsorshipMenu
        │                                   │
        │                                   │
        │                              (Menu Master)
        │
        ├───────────────┐
        │               │
        ▼               ▼
CompanyAssignment   SponsorshipContract
        │               │
        │               ├──────────────┐
        │               │              │
        ▼               ▼              ▼
      User        ContractMenu       Payment
                        │
                        │
                        ▼
                SponsorshipMenu


User
 │
 ├────────────── Department
 │
 ├────────────── Role
 │
 └────────────── AdvisorAssignment
                      │
                      │
                      ▼
                    User
```

---

# Entities

## Year

Represents one festival operation cycle.

Example:

* 2026年度技大祭
* 2027年度技大祭

### Relationships

```text
Year

1 ─── * YearlyCompany

1 ─── * SponsorshipMenu
```

### Notes

A Year also holds the document issuer information for its invoices and receipts — issuer name, postal code, address, contact email, and bank transfer account (`spec/model.md#Year`). It is data, edited by an Administrator, not a constant in the source code. A new Year copies these values from the previous Year.

The seal image (印影) is not stored in the database. It stays in the source code repository (`apps/web/public/images/43rd_Stamp.png`) by the user's decision on Issue #176 (`spec/domain.md#Document Issuer Information`).

---

# Company

Represents permanent company information.

Company information exists independently from festival years.

### Relationships

```text
Company

1 ─── * YearlyCompany
```

---

# YearlyCompany

Represents a company's participation in a specific festival year.

This is the central business entity of sponsorship activities.

Examples:

* 株式会社A × 2026年度
* 株式会社B × 2027年度

### Relationships

```text
YearlyCompany

* ─── 1 Year

* ─── 1 Company

1 ─── 0..1 CompanyAssignment

1 ─── 0..1 SponsorshipContract

1 ─── * ActivityLog
```

`YearlyCompany` stores a per-Year copy of Company contact fields (`postal_code`, `address`, `phone_number`, `website`, `contact_person_name`, `contact_email_or_form`, `memo`), populated at insert from `companies`. Updating one Yearly Company row plus its `companies` row must not rewrite other `yearly_companies` rows for the same `company_id`.

---

# CompanyAssignment

Represents the sponsorship member responsible for a company.

This relationship represents sales responsibility.

### Relationship

```text
YearlyCompany

1 ─── 0..1 CompanyAssignment

CompanyAssignment

* ─── 1 User
```

### Notes

* A Yearly Company has at most one CompanyAssignment: zero before an assignee is decided, one afterward.
* A single sponsorship member may be the assignee for multiple companies.
* Assignment is different from department membership.
* Sponsorship members may belong to any department.

---

# AdvisorAssignment

Represents advisor relationships between sponsorship members.

An advisor is also a sponsorship member.

### Relationship

```text
AdvisorAssignment

advisorUser
      │
      ▼
     User

memberUser
      │
      ▼
     User
```

### Notes

* A Sponsorship Member may have multiple Advisors within the same Year (no upper bound).
* Year + memberId + advisorId must be unique.
* The advisor does not directly own companies; the advisor manages assigned members.

Example:

```text
佐藤（Advisor）

supports

田中
鈴木
高橋
```

The advisor does not directly own companies.

The advisor manages assigned members.

A member may also be supported by more than one advisor at the same time within a Year — this relationship is many-to-many, not one advisor per member.

---

# SponsorshipContract

Represents a company's sponsorship agreement.

A YearlyCompany has at most one contract (zero before it is created).

### Relationship

```text
YearlyCompany

1 ─── 0..1 SponsorshipContract
```

### Notes

The contract contains multiple sponsorship menus.

---

# SponsorshipMenu

Represents a sponsorship menu master for a specific year.

Examples:

* パンフレット広告 1P
* Web掲載
* 企業ブース

### Relationship

```text
Year

1 ─── * SponsorshipMenu
```

---

# ContractMenu

Represents a sponsorship menu selected in a contract.

This is the actual contracted item.

Example:

```text
株式会社A

Contract

├── パンフレット広告1P ×1
├── Web掲載 ×2
└── 企業ブース ×1
```

### Relationship

```text
SponsorshipContract

1 ─── * ContractMenu


ContractMenu

* ─── 1 SponsorshipMenu
```

---

# Payment

Represents sponsorship payment status.

### Relationship

```text
SponsorshipContract

1 ─── 1 Payment
```

### Notes

Payment is confirmed by the Finance Department.

A Payment keeps the billed amount (`amount`, the contract total) and the received amount (`receivedAmount`) side by side, with `remarks` for the reason of any difference. A split payment is still one Payment row; `receivedAmount` holds the cumulative total (`spec/model.md#Payment`).

---

# Advertisement / Production Data

Advertisement itself is not an independent business entity.

Production-related information belongs to ContractMenu.

Examples:

* Google Drive folder
* Production method
* Completion status
* Submission status

are managed by ContractMenu.

---

# User

Represents system users.

A user may have:

* department membership
* roles
* sponsorship responsibilities
* advisor responsibilities

### Relationships

```text
User

* ─── 1 Department

* ─── * Role

1 ─── * CompanyAssignment

1 ─── * AdvisorAssignment
```

---

# Department

Represents organizational affiliation.

Example:

* 企業管理部門
* 広告管理部門
* 資料作成部門
* 企業ブース部門

### Relationship

```text
Department

1 ─── * User
```

---

# Role

Represents system permissions.

Fixed set (`spec/model.md#Role`):

* SPONSORSHIP_MEMBER
* ADVISOR
* FINANCE_DEPARTMENT
* ADVERTISEMENT_MANAGER
* ADMINISTRATOR

### Relationship

```text
User

* ─── * Role
```

---

# ActivityLog

Stores business history.

### Relationship

```text
YearlyCompany

1 ─── * ActivityLog


User

1 ─── * ActivityLog
```

---

# Cardinality Summary

| Entity A            | Relationship | Entity B            |
| ------------------- | ------------ | -------------------- |
| Year                | 1:N          | YearlyCompany        |
| Company             | 1:N          | YearlyCompany        |
| Year                | 1:N          | SponsorshipMenu       |
| YearlyCompany       | 1:0..1       | CompanyAssignment     |
| User                | 1:N          | CompanyAssignment     |
| User                | 1:N          | AdvisorAssignment     |
| YearlyCompany       | 1:0..1       | SponsorshipContract   |
| SponsorshipContract | 1:N          | ContractMenu          |
| SponsorshipMenu     | 1:N          | ContractMenu          |
| SponsorshipContract | 1:1          | Payment               |
| User                | N:1          | Department            |
| User                | N:N          | Role                  |
| YearlyCompany       | 1:N          | ActivityLog           |

---

# Design Principles

## Separate Organization and Responsibility

Department represents organizational affiliation.

CompanyAssignment and AdvisorAssignment represent sponsorship activities.

These concepts must not be combined.

---

## Separate Master and Transaction

SponsorshipMenu is master data.

ContractMenu is transactional data.

A company contract must always reference an existing SponsorshipMenu.

---

## Preserve Historical Data

Past festival years must remain unchanged.

Changes in future sponsorship menus must not affect completed contracts.

---

## Character Set and Collation

Every table uses `utf8mb4` with the binary collation `utf8mb4_0900_bin`.

Company names are Japanese, and similar names can be different companies. Comparison, uniqueness, and search therefore distinguish every character difference:

| Difference | Example | Treated as |
| ---------- | ------- | ---------- |
| Dakuten / handakuten | ビ / ピ | different |
| Kana type | ア / あ | different |
| Full / half width | Ａ / A, ハ / ﾊ | different |
| Letter case | A / a | different |
| Small kana | ヤ / ャ | different |
| Trailing space | `ABC` / `ABC ` | different |

The Japanese-aware collations (`utf8mb4_ja_0900_as_cs`, `_ks`) still treat full and half width as equal, so they are not used.

Consequences:

* `companies.company_name` and `sponsorship_menus (year_id, name)` uniqueness is exact. The same company written two ways (e.g. `株式会社ＡＢＣ` / `株式会社ABC`) becomes two Companies. Notation is normalized by people, before import or entry.
* Name search in the API (e.g. the `companyName` filter on Contract Menus) is case- and width-sensitive.
* Sorting is by code point, not by Japanese reading. Lists that need reading order sort by `companyNameKana` in the frontend.

**Exception: `users.email`** uses `utf8mb4_0900_ai_ci`. Email addresses are case-insensitive, and the email from Google sign-in may differ in case from the registered one.

The database default is also `utf8mb4_0900_bin` (set by `0001_baseline.up.sql`), so tables added later inherit it. Creating a database is covered in `spec/operations.md` and `spec/development.md`.

---

## Single Source of Truth

MySQL stores all authoritative business data.

Google Sheets, Forms, and Drive are external services.
