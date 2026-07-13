import { mockCompanies } from "@/lib/mock/companies"
import { mockUsers } from "@/lib/mock/users"
import type { SponsorshipProgress, YearlyCompany } from "@/types/yearly-company"

function companyName(companyId: string): string {
  const company = mockCompanies.find((c) => c.id === companyId)
  if (!company) {
    throw new Error(`mock data error: no Company found for id ${companyId}`)
  }
  return company.companyName
}

function memberName(userId: string | null): string | null {
  if (!userId) return null
  const user = mockUsers.find((u) => u.id === userId)
  if (!user) {
    throw new Error(`mock data error: no User found for id ${userId}`)
  }
  return user.name
}

/**
 * Placeholder data matching the GET /years/{yearId}/companies response shape (spec/api.md).
 * Replace with a real fetch to the API once the backend YearlyCompany endpoints exist.
 *
 * companyName is looked up from mockCompanies (rather than duplicated by hand) so the
 * two mock datasets can't drift apart — a real API response would join Company server-side.
 */
export const mockYearlyCompanies: YearlyCompany[] = [
  {
    id: "yc_001",
    yearId: "year_2026",
    companyId: "c_001",
    companyName: companyName("c_001"),
    companyStatus: "CONTINUING",
    phase: "PHASE_1",
    progress: "INVOICE_SENT",
    assignedMemberId: "user_001",
    assignedMemberName: memberName("user_001"),
    notes: "",
  },
  {
    id: "yc_002",
    yearId: "year_2026",
    companyId: "c_002",
    companyName: companyName("c_002"),
    companyStatus: "NEW",
    phase: "PHASE_2",
    progress: "MATERIALS_SENT",
    assignedMemberId: "user_002",
    assignedMemberName: memberName("user_002"),
    notes: "",
  },
  {
    id: "yc_003",
    yearId: "year_2026",
    companyId: "c_003",
    companyName: companyName("c_003"),
    companyStatus: "DORMANT",
    phase: "PHASE_3",
    progress: "NOT_CONTACTED",
    assignedMemberId: null,
    assignedMemberName: null,
    notes: "昨年度は協賛なし",
  },
  {
    id: "yc_004",
    yearId: "year_2026",
    companyId: "c_004",
    companyName: companyName("c_004"),
    companyStatus: "CONTINUING",
    phase: "PHASE_1",
    progress: "PAYMENT_RECEIVED",
    assignedMemberId: "user_001",
    assignedMemberName: memberName("user_001"),
    notes: "",
  },
  {
    id: "yc_005",
    yearId: "year_2026",
    companyId: "c_005",
    companyName: companyName("c_005"),
    companyStatus: "NEW",
    phase: "PHASE_2",
    progress: "CONFIRMED",
    assignedMemberId: "user_002",
    assignedMemberName: memberName("user_002"),
    notes: "物品協賛のため入金・請求は発生しない",
  },
]

/**
 * Mutates the shared mock array so reassigning a Yearly Company's assigned
 * member persists for the rest of the browser session (spec/usecase.md UC-04).
 * TODO: replace with POST /yearly-companies/{id}/assignments once the
 * backend exists (spec/api.md).
 */
export function updateAssignedMember(
  yearlyCompanyId: string,
  userId: string | null
): void {
  const yearlyCompany = mockYearlyCompanies.find(
    (yc) => yc.id === yearlyCompanyId
  )
  if (yearlyCompany) {
    yearlyCompany.assignedMemberId = userId
    yearlyCompany.assignedMemberName = memberName(userId)
  }
}

/**
 * Mutates the shared mock array so a progress change persists for the rest
 * of the browser session (spec/domain.md — Sponsorship progress belongs to
 * the Yearly Company).
 * TODO: replace with PATCH /yearly-companies/{id}/progress once the backend
 * exists (spec/api.md).
 */
export function updateProgress(
  yearlyCompanyId: string,
  progress: SponsorshipProgress
): void {
  const yearlyCompany = mockYearlyCompanies.find(
    (yc) => yc.id === yearlyCompanyId
  )
  if (yearlyCompany) {
    yearlyCompany.progress = progress
  }
}
