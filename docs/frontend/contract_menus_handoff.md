# Contract Menus機能 バックエンド連携 引き継ぎ資料

## 概要
バックエンド側にて「Contract Menus横断画面 (`src/app/contract-menus/page.tsx`)」を正常にモックデータから取得できるようにするための必要なエンドポイントとAPI実装が完了しました。

このドキュメントはフロントエンド担当者がバックエンドの新APIを利用して画面を結合するための引き継ぎ情報です。

## 実装されたAPIエンドポイント

### 1. `GET /years/{yearId}/contract-menus`
特定の年度(`yearId`)に紐づくすべての `ContractMenu` と、それに結合された親情報を取得します（横断管理用）。

**リクエスト例:**
```bash
GET /years/y-seed-test/contract-menus?status=WAITING&productionType=COMPANY
```

**クエリパラメータ（任意・絞り込み用）:**
- `companyName`: 企業名（部分一致）
- `sponsorshipMenuId`: 協賛メニューID（完全一致）
- `status`: 制作ステータス (`WAITING`, `PRODUCING` など)
- `productionType`: 制作者 (`COMPANY`, `INTERNAL` など)

**レスポンスのデータ構造:**
配列として以下の形式でデータが返ります。モック時にフロントエンド側で結合していた情報がAPI側で用意されています。
```typescript
{
  "data": [
    {
      "id": "contract_menu_id",
      "contractId": "contract_id",
      "sponsorshipMenuId": "menu_id",
      "quantity": 1,
      "unitPrice": "80000",
      "isGoodsSponsorship": false,
      "productionType": "COMPANY",
      "status": "WAITING",
      "driveUrl": null,
      "remarks": "",
      
      // 以下、サーバーサイドでJOINされて追加されたフィールド
      "companyName": "株式会社テスト",
      "yearlyCompanyId": " yearly_company_id",
      "sponsorshipMenuName": "パンフレット広告1P"
    }
  ],
  "message": "success"
}
```

## フロントエンド担当者への依頼事項

現在、`src/app/contract-menus/page.tsx` および `src/lib/data/sponsorship.ts` において、`mockContractMenus` などのモックデータを読み込み、UI側でデータをフィルタリング＆結合する（`visibleContractMenus` 等）仮のコードが残っています。

以下の対応をお願いします。

1. **`isApiEnabled()` を利用した実API通信への切り替え**
   - `sponsorship.ts` に新規で連携用の関数 (例: `listContractMenusAcrossYear`) を定義し、`apiFetch` を使って上記の `GET` エンドポイントを叩くように更新してください。
2. **`page.tsx` からの呼び出し変更**
   - 初回マウント時 (`useEffect`) や、各絞り込み用セレクトボックス・インプット（`companyNameQuery`, `statusFilter` 等）の値が変更されたタイミングで API を呼び出し、結果を再描画するように繋ぎ替えてください。
   - `yearlyCompany` や `sponsorshipMenu` 等を `mockSponsorshipContracts` から手動で `find` して探す処理は削除し、APIから返却されたフィールド (`cm.companyName` など) をそのまま表示させてください。
3. **ステータス・制作担当の更新**
   - `updateContractMenu` などのインライン編集機能は、バックエンド側には既に `PATCH /contract-menus/{id}/status` および `/production` が実装済みです。忘れずにこれらの通信を行うように設定してください。

以上、よろしくお願い致します。
