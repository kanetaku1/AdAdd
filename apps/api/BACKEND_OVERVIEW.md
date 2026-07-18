# AdAdd API バックエンド構造概要

このドキュメントは、AdAdd のバックエンド `apps/api` の構造を分かりやすく説明するためのものです。フロントエンド担当者や開発メンバーが、バックエンドの主要な役割とファイル配置を把握できるようにまとめています。

---

## 1. 何を実装しているか

`apps/api` は AdAdd の API サーバです。主に以下を提供します。

- 会社・年次会社（YearlyCompany）管理
- 契約（Contract）と契約メニュー（ContractMenu）管理
- スポンサーシップメニュー（SponsorshipMenu）管理
- 支払い（Payment）管理
- 活動ログ（ActivityLog）記録
- 開発用の簡易認証ミドルウェア
- MySQL への接続とマイグレーション

---

## 2. 主要なファイル・フォルダ

### `cmd/server/main.go`
- サーバ起動エントリポイント
- 環境変数を読み込み、DB 接続を初期化し、ルーティングを登録して HTTP サーバを起動します。

### `internal/config`
- 環境変数や設定値を扱うパッケージ
- アプリの設定を一元化します。

### `internal/db`
- MySQL への接続設定
- マイグレーション実行ロジック

### `internal/auth`
- 開発用認証/認可の実装
- `X-User-ID`, `X-User-Roles` ヘッダを使ってユーザー情報を判定します

### `internal/model`
- ドメインモデルの定義
- DB と JSON で使う構造体がここにまとまっています

### `internal/repository`
- DB とのやり取りを担当するレイヤー
- 各エンティティの CRUD/検索ロジックを集約しています

### `internal/service`
- ビジネスロジック層
- ハンドラから呼ばれ、リポジトリを使ってデータを操作し、必要なルールを実行します

### `internal/handler`
- HTTP リクエストを受け取るレイヤー
- リクエストのバリデーション、サービス呼び出し、レスポンス生成を行います

### `internal/handler/routes_register.go`
- ルーティング定義
- URL パスとハンドラを結び付けます

### `migrations`
- DB スキーマ変更用 SQL
- `up`/`down` ファイルでテーブル構造やカラム追加を管理します

### ドキュメント
- `API_DOCUMENTATION.md` — フロント向けの API 仕様概要
- `openapi.yaml` — OpenAPI 形式の API 定義
- `FRONTEND_HANDOFF.md` — フロントエンド担当者への引き継ぎ資料

---

## 3. リクエストの流れ

1. クライアントが HTTP リクエストを送信
2. `routes_register.go` のルート定義でハンドラが選択される
3. 認証ミドルウェアが `X-User-ID` / `X-User-Roles` を検査
4. ハンドラがリクエストを検証し、サービスを呼び出す
5. サービスがリポジトリを使って DB 操作を実行
6. 必要に応じて `ActivityLog` を追加記録
7. ハンドラが結果を JSON レスポンスで返却

---

## 4. 主要なドメインと関係

- `Year` — 祭りの年度。スポンサーシップメニューは年単位で管理される
- `Company` — 会社そのものの情報
- `YearlyCompany` — 会社と年度の紐付け。1 年度ごとの営業進捗を表す
- `Contract` — YearlyCompany に紐づく契約情報。1 年度あたり 1 件まで
- `ContractMenu` — 契約に含まれるスポンサーシップメニュー項目
- `SponsorshipMenu` — 年度ごとのマスター商品データ
- `Payment` — 契約に紐づく支払い情報
- `ActivityLog` — YearlyCompany に対する操作履歴

---

## 5. 使い方・起動方法

1. `apps/api` に移動
2. MySQL を起動
3. 環境変数を設定
   - `DATABASE_URL=mysql://root:pass@tcp(localhost:3306)/adadd?parseTime=true`
   - `MIGRATE_ON_START=true`
   - `APP_ENV=development`
   - `ALLOWED_ORIGINS=http://localhost:3000`
4. サーバ起動
   - `go run ./cmd/server`
5. API を呼ぶときは開発用ヘッダを付与
   - `X-User-ID: 任意の ID`
   - `X-User-Roles: staff,admin`

---

## 6. フロントエンドが見るべき場所

- `API_DOCUMENTATION.md` — 仕様とエラー形式
- `openapi.yaml` — 自動生成や型定義に使える正式仕様
- `FRONTEND_HANDOFF.md` — 実行手順や主要エンドポイントのまとめ

---

## 7. 追加で知っておくと良いこと

- 現在の認証は開発用のヘッダベース実装です。本番では JWT/OAuth などに置き換える必要があります
- Google Drive/Forms 連携は未実装で、`ContractMenu` の `DriveUrl` などはただのメタデータです
- エラー形式はエンドポイントによって若干異なるので、フロントでは `error` フィールドをログに出すか、`API_DOCUMENTATION.md` を参考にしてください
