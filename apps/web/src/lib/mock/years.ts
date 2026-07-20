import { mockCompanies } from "@/lib/mock/companies"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import type { CompanyStatus } from "@/types/yearly-company"
import type { Year } from "@/types/year"

export const mockYears: Year[] = [
  {
    id: "year_2026",
    name: "2026",
    startDate: "2026-04-01",
    endDate: "2026-11-30",
    isActive: true,
  },
]

/**
 * companyStatus auto-computation rule (spec/domain.md → Company Status):
 * Continuing requires a Yearly Company in the immediately preceding Year
 * AND a Sponsorship Contract on it; everything else is New. Dormant is
 * never auto-assigned — it's always a later manual reclassification (UC-02).
 */
function computeCompanyStatus(
  companyId: string,
  previousYearId: string | null
): CompanyStatus {
  if (!previousYearId) return "NEW"
  const previousYearlyCompany = mockYearlyCompanies.find(
    (yc) => yc.companyId === companyId && yc.yearId === previousYearId
  )
  if (!previousYearlyCompany) return "NEW"
  const hadContract = mockSponsorshipContracts.some(
    (c) => c.yearlyCompanyId === previousYearlyCompany.id
  )
  return hadContract ? "CONTINUING" : "NEW"
}

/**
 * Mutates the shared mock array so registering a Company into a Year
 * persists for the rest of the browser session (spec/usecase.md UC-01
 * Notes — the individual, mid-cycle registration path).
 * No-ops if the Company already has a Yearly Company for that Year
 * (Company + Year must be unique, spec/model.md).
 * TODO: replace with POST /years/{yearId}/companies once the backend
 * exists (spec/api.md).
 */
export function registerCompanyToYear(companyId: string, yearId: string): void {
  const alreadyRegistered = mockYearlyCompanies.some(
    (yc) => yc.companyId === companyId && yc.yearId === yearId
  )
  if (alreadyRegistered) return

  const company = mockCompanies.find((c) => c.id === companyId)
  if (!company) return

  const yearIndex = mockYears.findIndex((y) => y.id === yearId)
  const previousYearId = yearIndex > 0 ? mockYears[yearIndex - 1].id : null

  mockYearlyCompanies.push({
    id: crypto.randomUUID(),
    yearId,
    companyId,
    companyName: company.companyName,
    companyStatus: computeCompanyStatus(companyId, previousYearId),
    phase: "PHASE_3",
    progress: "NOT_CONTACTED",
    assignedMemberId: null,
    assignedMemberName: null,
    notes: "",
  })
}

/**
 * Creates a new Year, makes it the active one, and bulk-registers every
 * existing Company into it (spec/usecase.md UC-01 steps 1–5).
 * TODO: replace with POST /years once the backend exists (spec/api.md).
 */
export function addYear(input: {
  name: string
  startDate: string
  endDate: string
}): void {
  mockYears.forEach((y) => {
    y.isActive = false
  })

  const year: Year = {
    id: `year_${input.name}`,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: true,
  }
  mockYears.push(year)

  for (const company of mockCompanies) {
    registerCompanyToYear(company.id, year.id)
  }
}
