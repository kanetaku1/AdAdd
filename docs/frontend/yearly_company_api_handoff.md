# 年度協賛管理連携 API (YearlyCompany DTO) のフロントエンド連携仕様書

フロントエンド担当者様

今回、バックエンドの改修として `YearlyCompany` 関連API（一覧取得・詳細取得）において、画面表示に必要な「企業名」と「担当者情報」を最初からJOINしてまとめて返却する専用DTO（`YearlyCompanyResponse`）を構築いたしました。

これにより、これまでフロントエンドで発生していた「不足情報を補うための追加APIリクエスト（N+1問題）」や「モックデータによる無理やりな補完」を全て削除し、そのまま画面表示のモデルに流し込むことが可能になりました。

対象のエンドポイントと変更点、およびフロントエンド側にお願いしたい修正について以下にまとめます。

---

## 1. 対象エンドポイント

*   `GET /years/{yearId}/companies` （指定年度の協賛企業一覧）
*   `GET /yearly-companies/{id}` （年度協賛データの詳細取得）

※ 新規作成（`POST`）や更新（`PATCH` 等）のリクエストボディの仕様には変更ありません。

---

## 2. APIレスポンス（DTO）の変更点

これまで `companyId` しか返却されていなかったJSONレスポンスに、以下の3つのフィールドが追加されました。

*   `companyName`: string （紐づく `Company` の名前）
*   `assignedMemberId`: string | null （紐づく `User` のID）
*   `assignedMemberName`: string | null （紐づく `User` の名前）

### レスポンスJSON例 (GET /years/:yearId/companies の場合)

```json
{
  "message": "success",
  "data": [
    {
      "id": "yc-12345",
      "yearId": "y-2026",
      "companyId": "c-999",
      "companyStatus": "NEW",
      "phase": "PHASE_3",
      "progress": "PENDING",
      "notes": "",
      
      // 今回の改修で追加されたフィールド
      "companyName": "Seed株式会社",
      "assignedMemberId": "u-123",
      "assignedMemberName": "アド太郎"
    },
    {
      "id": "yc-12346",
      "yearId": "y-2026",
      "companyId": "c-888",
      "companyStatus": "CONTINUING",
      "phase": "PHASE_9",
      "progress": "CONFIRMED",
      "notes": "",
      
      // ▼担当者が未割当（0人）の場合は null になります（0..1制約保証済み）
      "companyName": "株式会社テスト",
      "assignedMemberId": null,
      "assignedMemberName": null
    }
  ]
}
```

---

## 3. 0..1制約の保証について（未割当時の挙動）

*   **担当者（アサイン）は `0..1` の制約です。**
*   もし担当者が割り当てられていない企業の場合、バックエンド側ではエラーにならずに安全に `null` を返却する仕組みを実装し、単体テストでも合格（PASS）を保証しています。
*   フロントエンド側では `assignedMemberId` や `assignedMemberName` が `null` で降ってくるケースを前提としてハンドルをお願いします。

---

## 4. フロントエンド側へのお願い事項（繋ぎ込み作業）

現在、フロントエンド側の `src/lib/data/sponsorship.ts` 等のファイルにおいて、「`YearlyCompany` のレスポンスに企業名が含まれていないこと」をカバーするための一時的なワークアラウンド（追加取得）が存在している状態です。

今回のAPI改修に伴い、以下の繋ぎ込み改修をお願いいたします。

### 1. 型定義（ApiYearlyCompany）の更新
バックエンドから返ってくるレスポンス型に、新たなフィールドを追加してください。

```typescript
type ApiYearlyCompany = {
  id: string
  yearId: string
  companyId: string
  companyStatus: CompanyStatus
  phase: SponsorshipPhase
  progress: SponsorshipProgress
  notes?: string
  // ▼ 以下を追加
  companyName: string
  assignedMemberId: string | null
  assignedMemberName: string | null
}
```

### 2. N+1（追加の単発FETCH）の削除
現在 `mapApiYearlyCompany` 関数内等の `// Assignment join is not on the YearlyCompany payload yet (backend Issue #10).` というコメント付近において、足りないデータを補うために `apiFetch<Company>(/companies/${raw.companyId})` などが走っています。

API側から既に合体データとして送られてくるようになったため、**この `apiFetch` を削除し、引数 `raw` が持っている `raw.companyName` や `raw.assignedMemberName` をそのままモデルにパスマッチさせて返却する形へリファクタリング**をお願いします。


以上となります。この切り替えによって通信量が激減し、一覧画面の描画パフォーマンスが劇的に向上しますので、繋ぎ込みよろしくお願いいたします！
