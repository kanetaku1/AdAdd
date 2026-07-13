/**
 * SponsorshipContract (spec/model.md#SponsorshipContract).
 * A Yearly Company has at most one contract (spec/domain.md), and it is only
 * created once an agreement is actually reached — there is no draft state.
 * Overall engagement progress is tracked on YearlyCompany.progress instead
 * of a separate contract status.
 */
export type SponsorshipContract = {
  id: string
  yearlyCompanyId: string
  contractDate: string
  totalAmount: number
  assigneeId: string | null
  assigneeName: string | null
  remarks: string
}
