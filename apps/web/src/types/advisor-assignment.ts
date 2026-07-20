/**
 * AdvisorAssignment (spec/model.md#AdvisorAssignment) — the supervision
 * relationship between a Sponsorship Advisor and a Sponsorship Member.
 * An Advisor is assigned to a Member, never to a Yearly Company
 * (spec/domain.md Rule 9) — supervision of companies is indirect, through
 * whichever Yearly Companies the supervised Member is assigned to.
 *
 * A Member may have multiple Advisors within the same Year, no upper bound
 * (spec/model.md constraint: Year + memberId + advisorId must be unique).
 */
export type AdvisorAssignment = {
  id: string
  yearId: string
  advisorId: string
  memberId: string
  assignedAt: string
}
