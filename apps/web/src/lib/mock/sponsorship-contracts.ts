import type { SponsorshipContract } from "@/types/sponsorship-contract"

/**
 * Placeholder data matching the GET /yearly-companies/{id}/contract response
 * shape (spec/api.md). A Yearly Company has at most one contract — yc_003
 * (信濃川建設株式会社, dormant/not contacted) intentionally has none.
 * Replace with a real fetch once the backend Contract endpoints exist.
 *
 * totalAmount must equal the sum of quantity * unitPrice across this
 * contract's Contract Menus (see mock/contract-menus.ts and spec/model.md).
 *
 * contract_004 (yc_005, 物品協賛) totals ¥0 by design — see
 * spec/domain.md#Contract Menu > Goods Sponsorship.
 */
export const mockSponsorshipContracts: SponsorshipContract[] = [
  {
    id: "contract_001",
    yearlyCompanyId: "yc_001",
    contractDate: "2026-06-01",
    totalAmount: 95000,
    assigneeId: "user_tanaka",
    assigneeName: "田中",
    remarks: "",
  },
  {
    id: "contract_002",
    yearlyCompanyId: "yc_002",
    contractDate: "2026-06-10",
    totalAmount: 50000,
    assigneeId: "user_suzuki",
    assigneeName: "鈴木",
    remarks: "企業側の最終確認待ち",
  },
  {
    id: "contract_003",
    yearlyCompanyId: "yc_004",
    contractDate: "2026-05-20",
    totalAmount: 130000,
    assigneeId: "user_tanaka",
    assigneeName: "田中",
    remarks: "",
  },
  {
    id: "contract_004",
    yearlyCompanyId: "yc_005",
    contractDate: "2026-06-20",
    totalAmount: 0,
    assigneeId: "user_suzuki",
    assigneeName: "鈴木",
    remarks:
      "物品協賛: お菓子・飲料の詰め合わせを提供いただいた(想定価値 約95,000円相当、2026年6月20日受領済み)。返礼としてパンフレット広告1P・ホームページ広告を無償提供(Contract Menu参照)。金銭のやり取りはなく入金確認は不要。",
  },
]
