import type { ContractMenu } from "@/types/contract-menu"

/**
 * Placeholder data matching the GET /contracts/{contractId}/menus response
 * shape (spec/api.md). Replace with a real fetch once the backend Contract
 * Menu endpoints exist.
 *
 * unitPrice values mirror mock/sponsorship-menus.ts defaultPrice at the time
 * these contracts were signed; a real contract may negotiate a different price.
 */
export const mockContractMenus: ContractMenu[] = [
  // contract_001 — 株式会社長岡テクノ (menu_001: 80000 + menu_003: 15000 = 95000)
  {
    id: "cm_001",
    contractId: "contract_001",
    sponsorshipMenuId: "menu_001",
    quantity: 1,
    unitPrice: 80000,
    isGoodsSponsorship: false,
    productionType: "COMPANY",
    status: "COMPLETED",
    driveUrl: "https://drive.google.com/mock/cm_001",
    remarks: "",
  },
  {
    id: "cm_002",
    contractId: "contract_001",
    sponsorshipMenuId: "menu_003",
    quantity: 1,
    unitPrice: 15000,
    isGoodsSponsorship: false,
    productionType: "INTERNAL",
    status: "PRODUCING",
    driveUrl: null,
    remarks: "ロゴ画像を素材として受領済み",
  },
  // contract_002 — 越後電機株式会社 (menu_002: 50000)
  {
    id: "cm_003",
    contractId: "contract_002",
    sponsorshipMenuId: "menu_002",
    quantity: 1,
    unitPrice: 50000,
    isGoodsSponsorship: false,
    productionType: null,
    status: "WAITING",
    driveUrl: null,
    remarks: "",
  },
  // contract_003 — 北越フーズ株式会社 (menu_001: 80000 + menu_002: 50000 = 130000)
  {
    id: "cm_004",
    contractId: "contract_003",
    sponsorshipMenuId: "menu_001",
    quantity: 1,
    unitPrice: 80000,
    isGoodsSponsorship: false,
    productionType: "COMPANY",
    status: "SUBMITTED",
    driveUrl: "https://drive.google.com/mock/cm_004",
    remarks: "",
  },
  {
    id: "cm_005",
    contractId: "contract_003",
    sponsorshipMenuId: "menu_002",
    quantity: 1,
    unitPrice: 50000,
    isGoodsSponsorship: false,
    productionType: null,
    status: "COMPLETED",
    driveUrl: null,
    remarks: "",
  },
  // contract_004 — 魚沼食品株式会社(物品協賛の返礼として無償提供。unitPrice
  // は共に0で合計0円 — spec/domain.md#Contract Menu > Goods Sponsorship。
  // 受領した物品の内容・想定価値は SponsorshipContract.remarks を参照)
  {
    id: "cm_007",
    contractId: "contract_004",
    sponsorshipMenuId: "menu_001",
    quantity: 1,
    unitPrice: 0,
    isGoodsSponsorship: true,
    productionType: "COMPANY",
    status: "WAITING",
    driveUrl: null,
    remarks: "",
  },
  {
    id: "cm_008",
    contractId: "contract_004",
    sponsorshipMenuId: "menu_003",
    quantity: 1,
    unitPrice: 0,
    isGoodsSponsorship: true,
    productionType: "INTERNAL",
    status: "REQUESTED",
    driveUrl: null,
    remarks: "",
  },
]

/**
 * Mutates the shared mock array so newly added Contract Menus persist for
 * the rest of the browser session (spec/usecase.md UC-07).
 * TODO: replace with POST /contracts/{contractId}/menus once the backend
 * exists (spec/api.md).
 */
export function addContractMenu(menu: ContractMenu): void {
  mockContractMenus.push(menu)
}

/**
 * Mirrors PATCH /contract-menus/{id}/status and .../production
 * (spec/api.md) so mock mode persists edits the same way the API does.
 */
export function updateContractMenu(
  id: string,
  patch: Partial<ContractMenu>
): ContractMenu {
  const index = mockContractMenus.findIndex((cm) => cm.id === id)
  if (index === -1) throw new Error("contract menu not found")
  const updated = { ...mockContractMenus[index], ...patch }
  mockContractMenus[index] = updated
  return updated
}

/** Mirrors DELETE /contract-menus/{id} (spec/api.md#Delete Contract Menu). */
export function removeContractMenu(id: string): ContractMenu | null {
  const index = mockContractMenus.findIndex((cm) => cm.id === id)
  if (index === -1) return null
  const [removed] = mockContractMenus.splice(index, 1)
  return removed
}
