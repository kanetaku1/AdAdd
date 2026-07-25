# Payment Amount Sync Handoff

## 概要

Contract Menu の追加・更新・削除に伴う `SponsorshipContract.totalAmount` 再計算時に、Payment の整合ルールが追加されました。

フロントエンドでは、Contract Menu 変更後の再取得と、`CONFIRMED` Payment がある契約で金額変更が拒否された場合の `409 Conflict` 表示を対応してください。

関連コミット:

- `73438f5 docs: define payment amount sync rule`
- `b81051a fix: sync waiting payment amount after menu changes`

関連仕様:

- `spec/model.md` Payment
- `spec/api.md` Update Contract / Contract Menu API / Payment API

## バックエンドの新しい挙動

Contract Menu を変更すると、バックエンドは同一トランザクションで以下を行います。

1. 対象 Contract の `totalAmount` を `quantity * unitPrice` の合計で再計算する
2. 既存 Payment が `WAITING` の場合、`Payment.amount` を最新の `totalAmount` に同期する
3. 既存 Payment が `CONFIRMED` で、再計算後の `totalAmount` が `Payment.amount` と異なる場合、変更を拒否する

`CONFIRMED` Payment で拒否された場合、Contract Menu の変更も Contract total の更新もロールバックされます。

## 対象 API

以下の API が Payment 整合ルールの影響を受けます。

```text
POST   /contracts/{contractId}/menus
DELETE /contract-menus/{id}
PATCH  /contract-menus/{id}/status
PATCH  /contract-menus/{id}/production
```

現状の UI で数量・単価を更新する API が追加される場合も、同じルールの対象です。

## 409 Conflict

`CONFIRMED` Payment の金額と Contract total が不一致になる変更は `409 Conflict` になります。

レスポンス形式:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "confirmed payment amount would no longer match contract total"
  }
}
```

推奨表示:

```text
支払い確認済みのため、契約金額が変わる変更はできません。
金額を変更する場合は、先に Finance で支払いステータスを「未確認」に戻してください。
```

このエラーは通信障害ではなく業務ルールによる拒否なので、入力値を失わない形でユーザーに理由を表示してください。

## フロントエンド対応ポイント

Contract Menu 変更成功後は、少なくとも以下を再取得してください。

- `GET /yearly-companies/{id}/contract`
- `GET /contracts/{contractId}/payment`
- `GET /contracts/{contractId}/menus` または `GET /years/{yearId}/contract-menus`

理由:

- `totalAmount` がサーバー管理で変わる
- `WAITING` Payment の `amount` もサーバー側で同期される
- Contract Menu 一覧だけをローカル更新すると、金額表示が古くなる可能性がある

## UI 上の注意

Payment が `WAITING` の場合:

- Contract Menu 変更後、Payment amount は自動で最新金額になる
- ユーザーに追加操作を求める必要はない
- 成功後に Contract / Payment を再取得して表示を更新する

Payment が `CONFIRMED` の場合:

- 金額が変わる Contract Menu 変更は拒否される
- `409 Conflict` をユーザー向けメッセージに変換する
- Finance で `WAITING` に戻してから変更する流れを案内する

## テスト観点

フロントエンド側では以下を確認してください。

- `WAITING` Payment がある契約で Contract Menu を追加した後、契約金額と支払い金額が同じ値で表示される
- `WAITING` Payment がある契約で Contract Menu を削除した後、契約金額と支払い金額が同じ値で表示される
- `CONFIRMED` Payment がある契約で金額変更になる Contract Menu 操作をしたとき、`409 Conflict` の業務メッセージが表示される
- `409 Conflict` 時に画面上だけ Contract Menu が変更済みに見えない
- `409 Conflict` 時にユーザーの入力内容が必要以上に破棄されない

## バックエンド検証状況

バックエンドでは以下を確認済みです。

```text
go test ./...
PASS
```

DB 結合テストは `ADADD_API_TEST_DSN` を設定した環境で実 DB に接続して実行されます。未設定の場合は skip されます。
