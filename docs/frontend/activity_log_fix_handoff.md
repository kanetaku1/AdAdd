# ActivityLog UUID 自動採番修正の引き継ぎ

このドキュメントは、バックエンドの `ActivityLog` において発生していたプライマリキーの重複エラーとその修正内容について、フロントエンドエンジニアに共有するための引継ぎ資料です。

## 📍 発生していた問題

YearlyCompanyのDTO改善（#33, Issue #10）にともなうE2E確認・フロント連携テストを実施中に、担当者の再割り当てなど、**「ActivityLogを2回目以降作成する操作」**を行うと以下のHTTP 500エラーが発生していました。

```text
Error 1062 (23000): Duplicate entry '' for key 'activity_logs.PRIMARY'
```

### 問題の原因
バックエンドのモデル定義（`apps/api/internal/model/models.go`）において、他のテーブル（`Company`, `User`, `YearlyCompany` など）にはIDの自動採番用フック（`BeforeCreate`）が実装されていましたが、**`ActivityLog` のみ実装がもれていました。**
そのため、データベースにIDが空文字列（`""`）のまま INSERT され、1件目は成功するものの、2件目以降でプライマリキーの重複エラーが発生していました。

## 📍 修正内容とバックエンドの対応

`apps/api/internal/model/models.go` の `ActivityLog` 構造体に対して、以下の通り `BeforeCreate` フックを追加し、UUID（v4）が自動採番されるよう修正しました。

```go
func (a *ActivityLog) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}
```

※ **注意点:** 
バックエンドソースコードの修正をDockerコンテナに反映させるためには、APIイメージの再ビルドが必要です。ローカル環境等で検証を続ける際は `docker compose up -d --build api` でサーバーを再構築したのちお試しください。

## 📍 フロントエンドへの影響および依頼事項

- 今回のエラーは**完全にバックエンド（サーバー/データベース設計）側の不具合**でした。
- そのため、**フロントエンド側のAPIリクエストの形式（ペイロード等）を変更していただく必要は一切ありません。**
- 引き続き、今のフロントエンドの実装（#33 の変更を含め）のまま、E2Eテスト・API接続確認を進めてください。担当者のアサイン変更などを何度繰り返しても、エラーにならずログが正常に記録されるようになっています。
