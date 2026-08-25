import { downloadCsv } from "@/lib/csv"
import type { Company } from "@/types/company"

/**
 * Company List CSV (spec/frontend.md#CSV Import / Export, Issue #134).
 * Japanese headers for the same ten keys as the import template.
 */
export const COMPANY_CSV_EXPORT_HEADERS = [
  "会社名",
  "会社名カナ",
  "郵便番号",
  "住所",
  "電話番号",
  "Webサイト",
  "企業担当者名",
  "連絡先",
  "初回協賛年",
  "引継ぎ事項",
] as const

export function companyCsvRow(company: Company): string[] {
  return [
    company.companyName,
    company.companyNameKana,
    company.postalCode,
    company.address,
    company.phoneNumber,
    company.website,
    company.contactPersonName,
    company.contactEmailOrForm,
    company.firstSponsorshipYear,
    company.memo,
  ]
}

export function downloadCompanyCsv(companies: Company[]): void {
  const rows = companies.map(companyCsvRow)
  downloadCsv("企業一覧.csv", [...COMPANY_CSV_EXPORT_HEADERS], rows)
}
