/**
 * SponsorshipMenuCategory (spec/model.md#Enumerations).
 * Determines management content, not medium — a homepage banner is still
 * ADVERTISEMENT (it requires submission, same as a print ad). Only BOOTH
 * has no submission step.
 */
export type SponsorshipMenuCategory = "ADVERTISEMENT" | "BOOTH"

/**
 * SponsorshipMenu (spec/model.md#SponsorshipMenu) — yearly master data.
 * Never belongs to a specific Company or Contract (spec/domain.md Rule 10).
 */
export type SponsorshipMenu = {
  id: string
  yearId: string
  name: string
  category: SponsorshipMenuCategory
  defaultPrice: number
  requiresSubmission: boolean
  isActive: boolean
}
