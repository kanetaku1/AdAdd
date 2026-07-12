/**
 * PaymentStatus (spec/model.md#Enumerations).
 */
export type PaymentStatus = "WAITING" | "CONFIRMED"

/**
 * Payment (spec/model.md#Payment) — payment information for a Sponsorship
 * Contract's sponsorship amount. A Sponsorship Contract has at most one
 * Payment (spec/model.md Constraints — no split/installment payments).
 *
 * confirmedAt doubles as both the payment date and the confirmation
 * timestamp — there is no separate "money arrived" date distinct from
 * "Finance confirmed it arrived" (spec/model.md#Payment).
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
