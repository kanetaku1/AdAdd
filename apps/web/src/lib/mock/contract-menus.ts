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
    productionType: null,
    status: "COMPLETED",
    driveUrl: null,
    remarks: "",
  },
]
