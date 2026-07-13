/**
 * AdvisorAssignment (spec/model.md#AdvisorAssignment) — the supervision
 * relationship between a Sponsorship Advisor and a Sponsorship Member.
 * An Advisor is assigned to a Member, never to a Yearly Company
 * (spec/domain.md Rule 9) — supervision of companies is indirect, through
 * whichever Yearly Companies the supervised Member is assigned to.
 *
 * A Member has at most one Advisor per Year (spec/model.md constraint:
 * Year + memberId must be unique).
 */
export type AdvisorAssignment = {
  id: string
  yearId: string
  advisorId: string
  memberId: string
  assignedAt: string
}
