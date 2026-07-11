/**
 * SponsorshipMenuCategory (spec/model.md#Enumerations).
 */
export type SponsorshipMenuCategory = "ADVERTISEMENT" | "BOOTH" | "WEB_LISTING"

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
