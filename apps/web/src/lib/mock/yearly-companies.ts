import { mockCompanies } from "@/lib/mock/companies"
import type { YearlyCompany } from "@/types/yearly-company"

function companyName(companyId: string): string {
  const company = mockCompanies.find((c) => c.id === companyId)
  if (!company) {
    throw new Error(`mock data error: no Company found for id ${companyId}`)
  }
  return company.companyName
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
    assignedMemberName: "田中",
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
    assignedMemberName: "鈴木",
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
    assignedMemberName: "田中",
    notes: "",
  },
]
