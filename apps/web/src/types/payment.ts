/**
 * PaymentStatus (spec/model.md#Enumerations).
 */
export type PaymentStatus = "WAITING" | "CONFIRMED"

/**
 * Payment (spec/model.md#Payment) — payment information for a Sponsorship
 * Contract's sponsorship amount. A Sponsorship Contract has at most one
 * Payment (spec/model.md Constraints — no split/installment payments).
 *
 * confirmedAt is the payment confirmation date — when Finance confirmed the
 * bank transfer in AdAdd, not necessarily the date the transfer itself
 * occurred. Used when generating the receipt (spec/usecase.md UC-10).
 *
 * confirmedById/confirmedByName follow the same denormalized xId + xName
 * pairing as SponsorshipContract.assigneeId/assigneeName: model.md only
 * defines confirmedById as the backend FK; confirmedByName is a
 * frontend-only convenience since no User master data/endpoint exists yet.
 */
export type Payment = {
  id: string
  contractId: string
  amount: number
  status: PaymentStatus
  confirmedAt: string | null
  confirmedById: string | null
  confirmedByName: string | null
}

/**
 * Payment joined with its owning Company/Yearly Company for cross-contract
 * views (spec/frontend.md#Finance Management, #Dashboard) — see
 * `GET /years/{yearId}/payments` in spec/api.md.
 */
export type PaymentAcrossYear = Payment & {
  companyName: string
  yearlyCompanyId: string
}
