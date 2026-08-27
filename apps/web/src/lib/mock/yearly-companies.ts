import type { Company } from "@/types/company"
import { mockCompanies } from "@/lib/mock/companies"
import { mockUsers } from "@/lib/mock/users"
import type {
  SponsorshipProgress,
  YearlyCompany,
  YearlyCompanyContact,
} from "@/types/yearly-company"

function companyById(companyId: string): Company {
  const company = mockCompanies.find((c) => c.id === companyId)
  if (!company) {
    throw new Error(`mock data error: no Company found for id ${companyId}`)
  }
  return company
}

/** Copy Company contact onto a Yearly Company (spec/model.md#YearlyCompany). */
export function contactSnapshotFromCompany(
  company: Company
): Pick<YearlyCompany, "companyName" | "companyNameKana"> &
  YearlyCompanyContact {
  return {
    companyName: company.companyName,
    companyNameKana: company.companyNameKana,
    postalCode: company.postalCode,
    address: company.address,
    phoneNumber: company.phoneNumber,
    website: company.website,
    contactPersonName: company.contactPersonName,
    contactEmailOrForm: company.contactEmailOrForm,
    memo: company.memo,
  }
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
 * Contact fields are a copy taken from mockCompanies at "creation" — Detail
 * edits this snapshot and the Company master, not other Years.
 *
 * contractTotalAmount is always `null` here — lib/data/sponsorship.ts's
 * enrichYearlyCompany() looks it up from the live mockSponsorshipContracts
 * array on every call instead.
 */
export const mockYearlyCompanies: YearlyCompany[] = [
  {
    id: "yc_001",
    yearId: "year_2026",
    companyId: "c_001",
    ...contactSnapshotFromCompany(companyById("c_001")),
    companyStatus: "CONTINUING",
    phase: "PHASE_1",
    progress: "INVOICE_SENT",
    assignedMemberId: "user_001",
    assignedMemberName: memberName("user_001"),
    contractTotalAmount: null,
    notes: "",
  },
  {
    id: "yc_002",
    yearId: "year_2026",
    companyId: "c_002",
    ...contactSnapshotFromCompany(companyById("c_002")),
    companyStatus: "NEW",
    phase: "PHASE_2",
    progress: "MATERIALS_SENT",
    assignedMemberId: "user_002",
    assignedMemberName: memberName("user_002"),
    contractTotalAmount: null,
    notes: "",
  },
  {
    id: "yc_003",
    yearId: "year_2026",
    companyId: "c_003",
    ...contactSnapshotFromCompany(companyById("c_003")),
    companyStatus: "DORMANT",
    phase: "PHASE_3",
    progress: "NOT_CONTACTED",
    assignedMemberId: null,
    assignedMemberName: null,
    contractTotalAmount: null,
    notes: "",
  },
  {
    id: "yc_004",
    yearId: "year_2026",
    companyId: "c_004",
    ...contactSnapshotFromCompany(companyById("c_004")),
    companyStatus: "CONTINUING",
    phase: "PHASE_1",
    progress: "PAYMENT_RECEIVED",
    assignedMemberId: "user_001",
    assignedMemberName: memberName("user_001"),
    contractTotalAmount: null,
    notes: "",
  },
  {
    id: "yc_005",
    yearId: "year_2026",
    companyId: "c_005",
    ...contactSnapshotFromCompany(companyById("c_005")),
    companyStatus: "NEW",
    phase: "PHASE_2",
    progress: "CONFIRMED",
    assignedMemberId: "user_002",
    assignedMemberName: memberName("user_002"),
    contractTotalAmount: null,
    notes: "",
  },
  {
    id: "yc_2025_001",
    yearId: "year_2025",
    companyId: "c_001",
    ...contactSnapshotFromCompany(companyById("c_001")),
    phoneNumber: "0258-99-2025",
    companyStatus: "CONTINUING",
    phase: "PHASE_3",
    progress: "RECEIPT_SENT",
    assignedMemberId: null,
    assignedMemberName: null,
    contractTotalAmount: null,
    notes: "",
  },
]

/**
 * Mutates the shared mock array so reassigning a Yearly Company's assigned
 * member persists for the rest of the browser session (spec/usecase.md UC-04).
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

/**
 * Updates this Year's contact snapshot. Does not touch other Yearly Companies.
 * Company master write-through is applied by the caller.
 */
export function updateContactSnapshot(
  yearlyCompanyId: string,
  contact: YearlyCompanyContact
): YearlyCompany | null {
  const yearlyCompany = mockYearlyCompanies.find(
    (yc) => yc.id === yearlyCompanyId
  )
  if (!yearlyCompany) return null
  Object.assign(yearlyCompany, contact)
  return yearlyCompany
}
