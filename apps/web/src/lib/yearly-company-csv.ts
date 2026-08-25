import { downloadCsv } from "@/lib/csv"
import {
  COMPANY_STATUS_LABEL,
  SPONSORSHIP_PHASE_LABEL,
  SPONSORSHIP_PROGRESS_LABEL,
} from "@/lib/yearly-company-labels"
import type { Company } from "@/types/company"
import type { YearlyCompany } from "@/types/yearly-company"

/**
 * Yearly Company List CSV (spec/frontend.md#CSV Import / Export,
 * Issue #133). Japanese headers; Advisor is a filter only, not a column.
 */
export const YEARLY_COMPANY_CSV_HEADERS = [
  "会社名",
  "企業ステータス",
  "協賛フェーズ",
  "担当者",
  "進捗",
  "協賛可否",
  "契約金額",
  "郵便番号",
  "住所",
  "電話番号",
  "Webサイト",
  "引継ぎ事項",
] as const

function contractAmountCell(amount: number | null): string {
  if (amount === null) return ""
  return String(amount)
}

export function yearlyCompanyCsvRow(
  yearlyCompany: YearlyCompany,
  company: Company | undefined
): string[] {
  return [
    yearlyCompany.companyName,
    COMPANY_STATUS_LABEL[yearlyCompany.companyStatus],
    SPONSORSHIP_PHASE_LABEL[yearlyCompany.phase],
    yearlyCompany.assignedMemberName ?? "",
    SPONSORSHIP_PROGRESS_LABEL[yearlyCompany.progress],
    yearlyCompany.contractTotalAmount !== null ? "契約あり" : "契約なし",
    contractAmountCell(yearlyCompany.contractTotalAmount),
    company?.postalCode ?? "",
    company?.address ?? "",
    company?.phoneNumber ?? "",
    company?.website ?? "",
    company?.memo ?? "",
  ]
}

export function downloadYearlyCompanyCsv(
  yearName: string,
  yearlyCompanies: YearlyCompany[],
  companies: Company[]
): void {
  const byId = new Map(companies.map((company) => [company.id, company]))
  const rows = yearlyCompanies.map((yearlyCompany) =>
    yearlyCompanyCsvRow(yearlyCompany, byId.get(yearlyCompany.companyId))
  )
  downloadCsv(`協賛企業-${yearName}.csv`, [...YEARLY_COMPANY_CSV_HEADERS], rows)
}
