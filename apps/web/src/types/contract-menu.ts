/**
 * ContractMenuProductionType (spec/model.md#Enumerations).
 * Only applies when the referenced Sponsorship Menu has requiresSubmission
 * = true; null for menus like Booth that never require submission.
 */
export type ContractMenuProductionType = "COMPANY" | "INTERNAL"

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
 */
export type ContractMenu = {
  id: string
  contractId: string
  sponsorshipMenuId: string
  quantity: number
  unitPrice: number
  productionType: ContractMenuProductionType | null
  status: ContractMenuStatus
  driveUrl: string | null
  remarks: string
}
