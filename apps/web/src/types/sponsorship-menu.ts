/**
 * SponsorshipMenu (spec/model.md#SponsorshipMenu) — yearly master data.
 * Never belongs to a specific Company or Contract (spec/domain.md Rule 10).
 *
 * requiresSubmission alone determines the Contract Menu management workflow
 * (submission/production tracking vs. none) — there is no separate category
 * field. It was removed because it never carried information beyond what
 * requiresSubmission already expressed (see spec/model.md#SponsorshipMenu).
 */
export type SponsorshipMenu = {
  id: string
  yearId: string
  name: string
  defaultPrice: number
  requiresSubmission: boolean
  isActive: boolean
}
