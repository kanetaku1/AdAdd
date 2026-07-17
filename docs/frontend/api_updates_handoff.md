# API 引き継ぎ最新情報 (review1.md 修正反映版)

このドキュメントは、バックエンド側に対する `review1.md` での指摘（一部API仕様変更や自動計算ロジック）をフロントエンドエンジニアに共有するための引継ぎ資料です。これまでの `apps/api/FRONTEND_HANDOFF.md` に加え、バックエンド連携時に以下の点にご注意ください。

## 📍 主要な変更点・自動計算（フロントからの送信不要）

これまでフロントエンドからの送信を前提としていましたが、バックエンド側で自動で計算・設定・検証される仕様に変更されたため、以下の値はリクエスト時に送信しても無視・上書きされます。

1. **契約時の担当者 (`assigneeId`)**
   - 変更前: API実行時のヘッダから取得
   - 変更後: 事前に登録されている `Assignment`（担当者アサイン）からAPI側で自動で引き継がれます。
2. **年次企業のステータス (`companyStatus`)**
   - 変更前: フロントから送信 (`CONTINUING` / `NEW`)
   - 変更後: システム側で過去の契約実績から判定し、自動で付与します。
3. **契約メニューの単価 (`unitPrice`)**
   - リクエスト内で `unitPrice` が未指定（0指定）の場合、選択した `SponsorshipMenu` マスタからデフォルト価格が自動補完されるようになりました。
4. **支払い作成時の金額 (`amount`)**
   - 変更後: `POST /contracts/:contractId/payment` 実行時、リクエストボディに金額を含める必要はなくなりました。対象契約の合計金額が自動で設定されます。

また、アサイン（担当者／アドバイザー）の作成において、重複があった場合は `500` エラーではなく事前チェックで `409 Conflict` が返るようになっています。

## 📍 API エンドポイントの最新ルーティング

今回修正・追加されたバックエンド API の現在のルーティングは以下の通りです。`apps/api/openapi.yaml` もこれに合わせて更新されています。

### 主なAPIフローと新規・調整エンドポイント
- **GET /years**, **POST /years** (年度の生成と各企業の YearlyCompany 一括自動生成フローの実行)
- GET /companies, POST /companies, PATCH /companies/:id
- GET /years/:yearId/companies, POST /years/:yearId/companies
- GET /yearly-companies/:id/contract
- POST /yearly-companies/:id/contract (契約の作成 - 1 YearlyCompanyに対し最大1契約、重複は409)
- PATCH /contracts/:contractId
- GET /contracts/:contractId/menus
- POST /contracts/:contractId/menus
- PATCH /contract-menus/:id/status
- PATCH /contract-menus/:id/production
- **POST /contracts/:contractId/payment** (支払いの新規作成)
- PATCH /payments/:paymentId (支払いステータス更新・確定等)

## 📍 テスト・検証に関する注意

- **自動テスト**: 既存のバックエンドサーバユニットテスト（`go test ./...`）はすべて修正後もパスしていますが、今回追加されたAPI（パスや支払い作成等）や自動計算ロジック自体に対する新しい「自動テストコード」は追加実装していません。
- **手動スモーク推奨**:
  フロントエンド結合時に、実際に `POST /years` を走らせて企業の一括展開状況を確認したり、その後の契約→支払い作成（`POST /contracts/:contractId/payment`）のフローが正しく通るかを合わせて（手動スモークとして）ご確認いただくようお願いします。
