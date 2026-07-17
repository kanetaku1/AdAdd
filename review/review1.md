## レビューまとめ

`spec/`(business.md / domain.md / model.md / api.md / backend.md / architecture.md)と `CLAUDE.md` を基準に、`apps/api` の実装を確認しました。レイヤリング(Handler→Service→Repository→Model)や `ActivityLog` をトランザクション内で記録する設計は `spec/backend.md` に沿っていて良い流れです 👍
一方で、**業務ルールに反する実装**と**中核フローが完結しないAPI欠落**がいくつかあるので、マージ前に直してほしいです。優先度順に書きます。

---

### 🔴 マージ前に直してほしい(業務が壊れる/仕様違反)

1. **Payment(支払い)を作れるAPIがない**
   `payment_handler.go` は GET/PATCHのみで `POST` がありません。`PaymentService.Create` はあるのに呼び出し元がなく、Paymentレコードを一切作れないので入金確認フロー(FR-006/UC-09)が最初から動きません。Contract作成時に紐づくPaymentを自動生成するか、`POST /contracts/{contractId}/payment` のようなエンドポイントを追加してください。

2. **Year(年度)を作るAPIがまるごと無い**
   `internal/repository/year_repository.go` はあるのにService/Handler/ルート登録が無く、`FR-001`(年度管理・High優先度)が未実装です。YearlyCompanyもSponsorshipMenuもYearに依存するので、年度が作れないと運用が始まりません。

3. **Company作成・更新APIが無い**
   `POST /companies` / `PATCH /companies/{companyId}` が `spec/api.md` に定義されているのに、`company_handler.go` は `GET /companies` しか登録していません。`CompanyService.Create` は実装済みなので、ハンドラ・ルート登録だけ足せば繋がるはずです。

4. **契約の `assigneeId` を「作成した人」から設定してしまっている**
   `contract_handler.go` の `createContract` で `req.AssigneeID = uid.(string)`(リクエストしたユーザー)を入れていますが、`spec/model.md` は「`assigneeId` は契約作成時に入力せず、既に `Assignment` でYearlyCompanyに割り当て済みのSponsorship Memberから引き継ぐ」と明記しています。今のままだと契約を叩いた人(adminなど)がそのまま担当者になってしまうので、Assignmentテーブルから取得するように直してください。

5. **`companyStatus`(Continuing/New)のサーバ側自動判定が無い**
   `domain.md` では「YearlyCompany生成時に `companyStatus` をサーバ側で自動計算する(前年度契約の有無で Continuing/New を判定、Dormantは生成時には絶対に自動設定しない)」とありますが、`createYearlyCompany` はリクエストボディの `companyStatus` をそのまま保存しているだけです。クライアント任せになってしまっているので、サービス層で計算するように直してください。

6. **開発用の認証スタブがそのまま(誰でもadminになれる)**
   `X-User-ID` / `X-User-Roles` ヘッダをそのまま信用しているので、ヘッダを偽装すれば誰でも全権限を取れます。開発中は仕方ないですが、`FRONTEND_HANDOFF.md` にも「本番はJWT/OAuthへの置き換えが必要」と書いてあるとおり、**このPRの説明欄やREADMEに「認証は未実装、本番前に必須」と明記**しておいてほしいです(見落として本番展開されるのが一番怖いので)。

---

### 🟠 仕様との不一致(動くけどズレてる)

7. `ContractMenu.status` の許容値が `DRAFT/SUBMITTED/PRODUCTION/COMPLETED/REJECTED` になっていますが、`spec/model.md` の `ContractMenuStatus` は `Waiting/Requested/Producing/Completed/Submitted` です。`Payment.status` も同様に `PENDING/CONFIRMED/CANCELLED` ではなく `Waiting/Confirmed` が仕様です(`CANCELLED`は仕様に無い値)。表記ゆれではなくDB保存値そのものなので、フロント実装が始まる前に揃えたいです。

8. `ContractMenu` 作成時に `unitPrice` を `SponsorshipMenu.defaultPrice` からデフォルト補完する仕様(`model.md`)と、`sponsorshipMenuId` が契約先と同じYearに属するかのチェック(制約)が、どちらも `ContractMenuService.Create` に実装されていません。

9. Assignment/AdvisorAssignmentの重複はDBのユニーク制約はありますが、Contract作成の時のような事前チェック+409化がされていないので、重複時は素の500エラーになります。Contractと同じパターンに揃えるとフロントも扱いやすいと思います。

---

### 🟡 気になった点(急ぎではない)

- `migrations/0003_add_deleted_at.up.sql` は `DELIMITER $$` を使ったストアドプロシージャ方式ですが、`db/migrate.go` は `golang-migrate` + `go-sql-driver/mysql` でDSN直送しているため、`DELIMITER` はMySQLサーバーには理解されず、`MIGRATE_ON_START=true` での自動適用時に失敗する可能性があります。`mysql` CLIで手動適用すると気づかないので、一度実際に `go run ./cmd/server` から自動マイグレーションを通してみてください。
- ロール名が `staff/admin/finance` に丸められていて、`spec/business.md` の部門(企業管理チーム/メニュー管理チーム/アドバイザー等)を区別できていません。`internal/auth/roles.go` の `RoleMatrix` もコメントで「canonical」と書いてある割にどこからも参照されていないので、使うか消すか整理してほしいです。
- `apps/api/FRONTEND_HANDOFF.md` と `openapi.yaml` に書かれているエンドポイント(`POST /yearly-companies`、`POST /contracts`、`POST /payments`、`PATCH /payments/:id/confirm` など)が実際のルーティングと一致していません(実際は `POST /years/:yearId/companies`、`POST /yearly-companies/:id/contract` など)。このままフロントに渡すと確実に事故るので、実装に合わせて直すか、逆に「本来こうあるべき」なら実装を直してください。

---

### 進め方について(フロントエンドと並行実装している件)

`frontend` ブランチを見たところ、まだモックデータ(`apps/web/src/lib/mock/*`)ベースで進んでいて、実バックエンドにはまだ繋いでいませんね。今のうちなら被害は小さいですが、このままお互い独立に進めると:

- フロントが「モックの形」で実装を固めてしまい、後で実際のAPIの形(ステータス値、`POST /payments`が無い、`assigneeId`の扱い等)と合わずに手戻りが発生する
- `spec/api.md` 自体がこのPRで更新されていない(`CLAUDE.md` 曰く spec/ が唯一のSSOT、API変更は必ず `spec/api.md` に反映するルール)ため、フロント側もバックエンド側も「本当の契約」を参照できていない

という状態です。なので、**両方が並行して機能を積み増す前に、一度ここで足並みを揃えることを提案します**:

1. まずこのPRの🔴項目(Payment作成・Year API・Company API・assigneeId・companyStatus自動計算)を直す
2. 直した内容を `spec/api.md` に反映する(エンドポイント・ステータス値を含めて)
3. `apps/api/openapi.yaml` / `FRONTEND_HANDOFF.md` を実装と一致させる
4. その後にフロントエンドをモックから実APIへ接続する

このタイミング合わせをせずにフロントのモック実装を先に進めてしまうと、ステータス値(`Waiting/Requested/...` vs `DRAFT/...`)や支払い作成フローの前提がズレたまま画面ができあがってしまうリスクが高いです。急いで両方進めるより、一旦バックエンドの🔴項目とspec反映を先に終わらせてから、フロントの本接続に進む順番をおすすめします。
