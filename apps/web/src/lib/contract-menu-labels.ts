import type {
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
  REQUESTED: "制作依頼済み",
  PRODUCING: "制作中",
  COMPLETED: "完成",
  SUBMITTED: "提出済み",
}

export const CONTRACT_MENU_STATUS_BADGE_VARIANT: Record<
  ContractMenuStatus,
  "default" | "secondary" | "outline"
> = {
  WAITING: "outline",
  REQUESTED: "outline",
  PRODUCING: "secondary",
  COMPLETED: "secondary",
  SUBMITTED: "default",
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
