import type {
  ContractMenuProductionDepartment,
  ContractMenuProductionType,
  ContractMenuStatus,
} from "@/types/contract-menu"

/**
 * UI Design Principle 2 (spec/frontend.md): show business language, not raw
 * enum values — e.g. WAITING reads as "広告データ提出待ち", matching the
 * example in spec/frontend.md's own UI Principle 2.
 */
export const CONTRACT_MENU_STATUS_LABEL: Record<ContractMenuStatus, string> = {
  WAITING: "広告データ提出待ち",
  PROVISIONAL_SUBMITTED: "仮提出済み",
  MATERIAL_COMPLETED: "素材データ完成",
  REQUESTED: "制作依頼済み",
  COMPANY_REVIEWING: "企業への確認中",
  PRODUCING: "制作中",
  COMPLETED: "完成",
  SUBMITTED: "提出済み",
}

export const CONTRACT_MENU_STATUS_BADGE_VARIANT: Record<
  ContractMenuStatus,
  "default" | "secondary" | "outline"
> = {
  WAITING: "outline",
  PROVISIONAL_SUBMITTED: "secondary",
  MATERIAL_COMPLETED: "default",
  REQUESTED: "outline",
  COMPANY_REVIEWING: "secondary",
  PRODUCING: "secondary",
  COMPLETED: "secondary",
  SUBMITTED: "default",
}

export function getContractMenuStatusLabel(
  status: ContractMenuStatus,
  productionType?: ContractMenuProductionType | null
): string {
  if (status === "WAITING") {
    return productionType === "INTERNAL"
      ? "素材データ提出待ち"
      : "広告データ提出待ち"
  }
  if (status === "PROVISIONAL_SUBMITTED") {
    return productionType === "INTERNAL"
      ? "素材データ仮提出済み"
      : "広告データ仮提出済み"
  }
  return CONTRACT_MENU_STATUS_LABEL[status]
}

/**
 * spec/business.md — Company Production: company submits a finished product.
 * Internal Production: company submits raw material for the committee to produce from.
 */
export const CONTRACT_MENU_PRODUCTION_TYPE_LABEL: Record<
  ContractMenuProductionType,
  string
> = {
  COMPANY: "企業",
  INTERNAL: "委員",
  CONTINUED: "継続",
}

export const CONTRACT_MENU_PRODUCTION_DEPARTMENT_LABEL: Record<
  ContractMenuProductionDepartment,
  string
> = {
  DOCUMENT_CREATION_DEPARTMENT: "資料作成部門",
  PRODUCTION_BUREAU: "制作局",
  SOCIAL_MEDIA_DEPARTMENT: "SNS部門",
}
