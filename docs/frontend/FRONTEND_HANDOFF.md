FRONTEND HANDOFF — AdAdd (apps/api)

概要

このドキュメントはフロントエンドエンジニア向けの引き継ぎ資料です。現在のバックエンドは要件（spec および CLAUDE.md）に沿って主要なドメイン、API、マイグレーション、ビジネスロジック（ActivityLog 等）を実装済みで、フロントエンド実装を開始できる状態にあります。

重要な注意点（必ず確認してください）
- 認証: 本リポジトリの認証は開発用のヘッダスタブを使用しています（X-User-Id, X-User-Roles）。本番では JWT/OAuth 等へ差し替えが必要です。詳細は internal/auth/ のコードをご確認ください。
- 外部連携: Google Drive/Forms 等の外部連携は未実装です。ContractMenu の DriveUrl 等はメタデータとして扱います。
- エラー形式: エラー JSON の形はエンドポイントにより若干の差があります。フロント側ではエラーレスポンスをログに出すか、API_DOCUMENTATION.md を参照して実装してください。

ローカル実行手順（開発者向け）
1. MySQL を起動（例）:
   docker run --name adadd-mysql -e MYSQL_ROOT_PASSWORD=pass -e MYSQL_DATABASE=adadd -p 3306:3306 -d mysql:8
2. リポジトリをチェックアウトし、apps/api ディレクトリへ移動
3. 環境変数を設定（例）:
   - DATABASE_URL=mysql://root:pass@tcp(localhost:3306)/adadd?parseTime=true
   - MIGRATE_ON_START=true
   必要に応じて .env を作成
4. マイグレーション適用: アプリ起動時にマイグレーションが走る設定です。別途 migrate を使う場合は apps/api/migrations を参照
5. サーバ起動:
   cd apps/api
   go run ./cmd/server
6. 開発用認証ヘッダを付けて API を叩く:
   - X-User-Id: 任意の UUID 文字列
   - X-User-Roles: カンマ区切りの役割（例: staff,admin）

主要エンドポイント（抜粋）
- GET /health
- POST /yearly-companies
- GET /yearly-companies/:id
- POST /contracts (契約を作成 — 1 YearlyCompany に対し最大1契約、重複は 409 を返す)
- GET /contracts/:id
- GET /contracts/:contractId/menus
- POST /contracts/:contractId/menus
- PATCH /contract-menus/:id/status
- PATCH /contract-menus/:id/production
- POST /payments
- PATCH /payments/:id/confirm  (支払い確定フロー)

詳細なパラメータ、サンプルリクエストについては openapi.yaml を参照してください（自動生成や型の生成に利用できます）。

テスト・検証
- サーバのユニットテスト（internal/handler と internal/service）を実行済み。apps/api ディレクトリで go test ./... を実行してください。
- 手動スモーク: マイグレーション適用 → サーバ起動 → 以下の基本フローを確認してください:
  1. Year / SponsorshipMenu を DB に作成（管理画面用のシードが無い場合は直接 SQL で挿入）
  2. YearlyCompany を POST で作成
  3. Contract を作成
  4. ContractMenu を追加
  5. Payment を POST し、PATCH で確定
  6. ActivityLog にそれぞれの操作が記録されていることを確認

既知の制限と今後の推奨作業
- 認証の本番化（JWT/OAuth）を実装すること
- OpenAPI から自動生成したクライアント/型定義をフロント側に配布すると開発効率が向上します（本リポジトリに openapi.yaml を追加済み）
- レスポンス/エラー形式の標準化（エラーコード、message フィールド、validation errors の形式統一）
- CI の追加（GitHub Actions でマイグレーション + go test を走らせるのが推奨）

連絡先・追加対応
- バックエンドに関する追加実装、OpenAPI の修正、CI 追加、認証実装などはこちらで作業可能です。どの作業を優先するか指示をください。追加で必要であればフロント用サンプルリクエスト群も作成します。

作成日: 2026-07-13T17:22:36+09:00
作成者: Copilot CLI ランタイム上の AI アシスタント
