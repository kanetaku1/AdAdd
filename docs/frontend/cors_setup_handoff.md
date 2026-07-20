# CORS設定と環境別対応に関するフロントエンド引き継ぎ

フロントエンドからのAPI通信を可能にするため、バックエンドに環境別のCORS（Cross-Origin Resource Sharing）設定を追加しました。

## 実装内容と変更点
- **`config.go` / `main.go`へのCORSミドルウェア導入**: 
  新たに `APP_ENV` (実行環境) と `ALLOWED_ORIGINS` (許可オリジン) を環境変数から読み込むようにしました。これに伴い、`X-User-ID` や `X-User-Roles`、将来的な `Authorization` などの各種ヘッダでの通信が正常に受け入れられる構成になっています。
- **ローカル開発環境 (`development`) の振る舞い**: 
  `APP_ENV=development` の場合、特別な指定がなくとも自動的に `http://localhost:3000` と `http://localhost:3001` が許可オリジンとして追加されます。そのため、ローカルでNext.jsなどのフロントエンド開発を行う際には、特別な手順を踏むことなくAPIへ通信が可能です。
- **本番・その他環境への対応**: 
  ローカル以外（例えば本番環境など）では、コンテナ起動時やサーバー設定において、`ALLOWED_ORIGINS=https://adadd.example.com` のように許可するドメインを明示的に指定することで、指定先以外の悪意あるオリジンからのアクセスを拒否します。

## フロントエンド運用時にご対応いただきたいこと
1. **API接続確認**: 
   ローカル開発時にバックエンド（通常は `http://localhost:8080`）へアクセスする際、これまで生じていたCORSエラー（Preflightエラー等のブラウザブロック）が解消され、正しくデータが取得・送信できるかご確認ください。
2. **`NEXT_PUBLIC_API_BASE_URL`**: 
   Web側の設定として `NEXT_PUBLIC_API_BASE_URL` にAPIサーバーのベースURLを向けて通信を行っていただければ、正常に動作します。

> 💡 起動方法等は、バックエンドリポジトリの `apps/api/BACKEND_OVERVIEW.md` および `.env.example` にも記載しています。
