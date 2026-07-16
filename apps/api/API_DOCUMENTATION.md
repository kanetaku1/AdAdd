# AdAdd API ドキュメント

このドキュメントはバックエンド API をフロントエンドエンジニアに渡すための簡易仕様書です。
実装済みの主要エンドポイント、認証・認可の方法、リクエスト/レスポンス例を示します。

## 認証
- 簡易開発用認証: HTTP ヘッダに `X-User-ID`（ユーザーID）と `X-User-Roles`（カンマ区切りロール）を付与してください。
- 例: `X-User-ID: user-admin`, `X-User-Roles: admin,staff`

## HTTP レスポンス概要
- 成功: 200/201 と JSON `{ "data": ..., "message": "success|created|updated" }`
- エラー: 400 (Bad Request)、401 (Unauthenticated)、403 (Forbidden)、404 (Not Found)、409 (Conflict)、500 (Server Error)
- バリデーションエラーは 400 を返します。ボディ: `{ "error": "説明" }`

---

## エンドポイント一覧（主要）

### Health
- GET /health
- 説明: サーバの生存確認

### Companies
- GET /companies
- 説明: 会社の一覧取得（公開）

### YearlyCompany
- GET /years/:yearId/companies
  - 説明: 指定年の YearlyCompany 一覧取得
- POST /years/:yearId/companies
  - 説明: YearlyCompany 作成（staff, admin）
  - ボディ例:
    {
      "companyId": "<company-id>",
      "companyStatus": "CONTACTED",
      "phase": "INITIAL",
      "notes": "..."
    }
- PATCH /yearly-companies/:id/company-status
  - 説明: 会社ステータス更新（staff, admin）
  - ボディ: { "companyStatus": "..." }
- PATCH /yearly-companies/:id/phase
  - 説明: フェーズ更新（staff, admin）
  - ボディ: { "phase": "..." }

### Contracts
- GET /yearly-companies/:id/contract
  - 説明: YearlyCompany に紐づく契約取得
- POST /yearly-companies/:id/contract
  - 説明: 契約作成（staff, admin）。作成時に YearlyCompany.progress を CONFIRMED に更新
  - assigneeId はリクエスト不可（CompanyAssignment からサーバ設定）
  - バリデーション: totalAmount は非負
  - ボディ例:
    {
      "totalAmount": "15000",
      "remarks": "Initial contract"
    }
  - エラー: 既に契約が存在する場合は 409 Conflict を返します
- PATCH /contracts/:contractId
  - 説明: 契約更新（staff, admin）。totalAmount / assigneeId はサーバ管理

### Sponsorship Menus
- GET /years/:yearId/sponsorship-menus
  - 説明: 年別のスポンサーシップメニュー取得
- POST /years/:yearId/sponsorship-menus (staff, admin)
  - 説明: メニュー作成
  - バリデーション: name 必須, defaultPrice は非負
- PATCH /sponsorship-menus/:menuId (staff, admin)
  - 説明: メニュー更新

### Contract Menus
- GET /contracts/:contractId/menus
  - 説明: 契約に紐づくメニュー一覧
- POST /contracts/:contractId/menus (staff, admin)
  - 説明: 契約メニュー追加。追加後に親契約の totalAmount を再計算
  - unitPrice 省略時は defaultPrice。明示 0 は保持。isGoodsSponsorship=true なら unitPrice=0
  - バリデーション: sponsorshipMenuId 必須, quantity > 0, unitPrice 非負
- DELETE /contract-menus/:id (staff, admin)
  - 説明: 契約メニュー削除。削除後に totalAmount を再計算
- PATCH /contract-menus/:id/status (staff, admin)
  - 説明: ステータス更新
  - ボディ: { "status": "SUBMITTED" }
- PATCH /contract-menus/:id/production (staff, admin)
  - 説明: 制作情報（Drive URL 等）をアップロードしてステータスを SUBMITTED にする
  - ボディ: { "driveFolderUrl": "...", "remarks": "..." }

### Payments
- GET /contracts/:contractId/payment
  - 説明: 指定契約の支払い情報取得
- POST /contracts/:contractId/payment (staff, admin, finance)
  - 説明: 支払い作成（totalAmount > 0 の契約のみ。契約作成時には自動作成しない）
  - エラー: totalAmount=0 は 400、既存 Payment は 409
- PATCH /payments/:paymentId (finance, admin)
  - 説明: 支払い情報更新（ステータス変更など）
  - バリデーション: status は WAITING|CONFIRMED
  - CONFIRMED にするとサーバ側で confirmedAt/confirmedById がセットされます
  - WAITING に戻すと confirmedAt/confirmedById をクリア

### Assignments（CompanyAssignment 0..1）
- POST /yearly-companies/:id/assignments (admin)
  - 説明: 担当メンバーを置換。`userId: null` でクリア
- GET /users/me/companies
  - 説明: 自分に割り当てられた YearlyCompany を取得

### Advisor Assignments
- GET /advisor-assignments?yearId={yearId}
  - 説明: Year の AdvisorAssignment 一覧（Member あたり複数可）
- POST /advisor-assignments (admin)
  - 説明: Advisor 追加。同一 year+member+advisor は 409
  - ボディ: { "yearId", "advisorUserId", "memberUserId" }
- DELETE /advisor-assignments/:id (admin)
  - 説明: AdvisorAssignment 削除

### Activity Logs
- GET /yearly-companies/:id/activity-logs (staff, admin)
  - 説明: YearlyCompany の活動ログを取得

---

## エラー形式
- バリデーション: 400 `{ "error": "説明" }`
- 権限エラー: 403 `{ "error": "forbidden" }`
- 認証なし: 401 `{ "error": "unauthenticated" }`
- 既存リソース: 409 `{ "error": "..." }`

---

## 注意点／今後の作業
- 現在の認証は開発用のヘッダベース実装です。本番では JWT などに置き換える必要があります。
- Google Drive 等の外部連携は別タスクで実装します。
- CI に MySQL コンテナを立ててマイグレーション→テスト→スモークを自動化することを推奨します。

---

必要であれば、このドキュメントをさらに OpenAPI (Swagger) 形式に変換してフロントチーム向けのインタラクティブ仕様を作成します。ご希望を教えてください。