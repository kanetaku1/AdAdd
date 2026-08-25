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
 * Per-Year contact snapshot copied from Company at Yearly Company creation
 * (spec/model.md#YearlyCompany). Detail edits write this snapshot and the
 * Company master; other Years are left unchanged.
 */
export type YearlyCompanyContact = {
  postalCode: string
  address: string
  phoneNumber: string
  website: string
  contactPersonName: string
  contactEmailOrForm: string
  memo: string
}

/**
 * YearlyCompany (spec/model.md#YearlyCompany) — the central aggregate of AdAdd.
 * Denormalized with companyName/companyNameKana/assignedMemberName for list
 * display convenience; the backend API joins Company/CompanyAssignment.
 *
 * assignedMemberId/assignedMemberName represent the single assignee from
 * CompanyAssignment (0..1 — spec/model.md#CompanyAssignment).
 *
 * contractTotalAmount is joined from the Yearly Company's SponsorshipContract
 * (0..1, 1:1 — spec/model.md); null when no contract exists yet. See
 * spec/api.md#List Yearly Companies.
 *
 * Contact fields are this Year's snapshot, not a live Company join.
 * `notes` is unused in the UI; handover text is `memo`.
 */
export type YearlyCompany = {
  id: string
  yearId: string
  companyId: string
  companyName: string
  companyNameKana: string
  companyStatus: CompanyStatus
  phase: SponsorshipPhase
  progress: SponsorshipProgress
  assignedMemberId: string | null
  assignedMemberName: string | null
  contractTotalAmount: number | null
  notes: string
} & YearlyCompanyContact
