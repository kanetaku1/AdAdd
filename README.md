# AdAdd

> **Sponsor Collaboration Platform**

AdAdd は、技大祭における協賛業務を一元管理するためのプラットフォームです。

企業管理・営業進捗・協賛メニュー管理・協賛金管理など、複数の部門に分散している情報を統合し、協賛業務全体を支援します。

---

## Vision

協賛業務をもっとシンプルに。

AdAdd は、業務そのものを変えるのではなく、業務の状態を一元管理し、誰でも現在の状況を把握できる環境を提供します。

---

## ⚠️ 注意: 認証について

現在のバックエンド実装において、APIの認証は `X-User-ID` および `X-User-Roles` ヘッダーを利用したモック（スタブ）となっています。
**本番環境への展開前には、必ずJWTやOAuthなどを利用した適切な認証機構への置き換えが必要です。**

---

## Features

* 年度管理
* 企業管理
* 年度企業管理
* 協賛契約管理
* 協賛進捗管理
* 協賛メニュー管理
* 協賛金管理
* 権限管理
* Google Drive連携
* Google Forms連携

---

## Design Principles

本プロジェクトでは以下の原則を重視します。

* Business First
* Domain Driven Design
* Documentation First
* AI Driven Development
* Single Source of Truth

設計を十分に行ってから実装を開始します。

---

## Tech Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui

### Backend

* Go
* Echo
* GORM

### Database

* MySQL

### External Services

* Google Drive
* Google Forms
* Google Groups

---

## Repository Structure

```text
.
├── README.md
├── CLAUDE.md
├── spec/
├── docs/
├── apps/
├── packages/
├── database/
└── .github/
```

---

## Documentation

### Project

* `spec/vision.md`
* `spec/business.md`
* `spec/requirements.md`
* `spec/usecase.md`

### Design

* `spec/domain.md`
* `spec/model.md`
* `spec/masters.md`
* `spec/architecture.md`
* `spec/frontend.md`
* `spec/backend.md`
* `spec/database.md`
* `spec/api.md`

### Development

* `spec/development.md`

### Architecture Decision Records

* `spec/decisions/`

---

## Development Process

本プロジェクトでは次の順序で開発を行います。

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
    ↓
Test
```

設計が完了していない機能は実装しません。

---

## Development Philosophy

* 業務を理解してから設計する
* 実装より設計を優先する
* ドメインモデルを中心に設計する
* MySQL を唯一の正（Single Source of Truth）とする
* Google Workspace は既存業務との連携手段として利用する

---

## Current Scope

### Included

* 年度管理
* 企業管理
* 年度企業管理
* 協賛契約管理
* 協賛メニュー管理
* 協賛金管理
* 履歴管理
* 権限管理
* 請求書・領収書PDFの生成(既存データからオンデマンド、FR-015)

### Not Included

* メール送信機能
* AIアシスタント
* 広告制作
* 財務処理

これらは既存業務・既存システムと連携して運用します。

---

## Getting Started

Coming Soon

---

## Roadmap

### Phase 1

* Business Analysis
* Requirements Definition

### Phase 2

* Domain Design
* Database Design
* API Design

### Phase 3

* MVP Development

### Phase 4

* Production Release

---

## License

This project is licensed under the MIT License.
