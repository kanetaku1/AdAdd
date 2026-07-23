/**
 * ContractMenuProductionType (spec/model.md#Enumerations).
 * Only applies when the referenced Sponsorship Menu has requiresSubmission
 * = true; null for menus like Booth that never require submission.
 */
export type ContractMenuProductionType = "COMPANY" | "INTERNAL" | "CONTINUED"

/**
 * ContractMenuStatus (spec/model.md#Enumerations).
 */
export type ContractMenuStatus =
  | "WAITING"
  | "REQUESTED"
  | "PRODUCING"
  | "COMPLETED"
  | "SUBMITTED"

/**
 * ContractMenu (spec/model.md#ContractMenu) — one Sponsorship Menu a company
 * has actually contracted for, as part of a Sponsorship Contract.
 * unitPrice defaults from SponsorshipMenu.defaultPrice but may be overridden.
 *
 * isGoodsSponsorship marks this line as a free return for goods sponsorship
 * (物品協賛) rather than a paid item (unitPrice is conventionally 0 when
 * true). This is a per-ContractMenu flag, not a property of the referenced
 * SponsorshipMenu — the same menu (e.g. a Pamphlet ad) can be sold normally
 * in one contract and given as a goods-sponsorship return in another. The
 * goods received (description, estimated value) are recorded in
 * SponsorshipContract.remarks, not here (spec/domain.md#Contract Menu >
 * Goods Sponsorship).
 */
export type ContractMenu = {
  id: string
  contractId: string
  sponsorshipMenuId: string
  quantity: number
  unitPrice: number
  isGoodsSponsorship: boolean
  productionType: ContractMenuProductionType | null
  status: ContractMenuStatus
  driveUrl: string | null
  remarks: string
}

/**
 * ContractMenu joined with its owning Company/Sponsorship Menu for
 * cross-contract views (spec/frontend.md#Contract Menu List, #Ad Material
 * Progress) — see `GET /years/{yearId}/contract-menus` in spec/api.md.
 */
export type ContractMenuAcrossYear = ContractMenu & {
  companyName: string
  yearlyCompanyId: string
  sponsorshipMenuName: string
}
