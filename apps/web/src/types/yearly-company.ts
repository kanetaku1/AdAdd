/**
 * CompanyStatus (spec/model.md#Enumerations) — relationship history, informed by past data.
 */
export type CompanyStatus = "CONTINUING" | "NEW" | "DORMANT"

/**
 * SponsorshipPhase (spec/model.md#Enumerations) — outreach priority ranking for the current
 * Year, set by the Company Management Team during the preparation period (UC-02). Independent
 * of CompanyStatus.
 */
export type SponsorshipPhase = "PHASE_1" | "PHASE_2" | "PHASE_3" | "PHASE_4"

/**
 * SponsorshipProgress (spec/model.md#Enumerations).
 */
export type SponsorshipProgress =
  | "NOT_CONTACTED"
  | "MATERIALS_SENT"
  | "CONFIRMED"
  | "INVOICE_SENT"
  | "PAYMENT_RECEIVED"
  | "RECEIPT_SENT"
  | "DECLINED"
  | "PENDING"

/**
 * YearlyCompany (spec/model.md#YearlyCompany) — the central aggregate of AdAdd.
 * Denormalized with companyName/assignedMemberName for list display convenience;
 * the backend API is expected to join Company/Assignment when returning this shape.
 *
 * assignedMemberId/assignedMemberName represent a single primary assignee, even
 * though Assignment is domain-modeled as 1:* (spec/model.md#Assignment) — a
 * stated frontend scope simplification, see spec/frontend.md#Yearly Company List.
 */
export type YearlyCompany = {
  id: string
  yearId: string
  companyId: string
  companyName: string
  companyStatus: CompanyStatus
  phase: SponsorshipPhase
  progress: SponsorshipProgress
  assignedMemberId: string | null
  assignedMemberName: string | null
  notes: string
}
