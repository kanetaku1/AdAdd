import { apiFetch, isApiEnabled, ApiError } from "@/lib/api/client"
import { csvCell, parseCsv } from "@/lib/csv"
import {
  addCompany as addMockCompany,
  mockCompanies,
  updateCompany as updateMockCompany,
} from "@/lib/mock/companies"
import type { BulkError, BulkResult } from "@/types/bulk"
import type { Company } from "@/types/company"

export const COMPANY_CSV_HEADERS = [
  "companyName",
  "companyNameKana",
  "postalCode",
  "address",
  "phoneNumber",
  "website",
  "contactPersonName",
  "contactEmailOrForm",
  "firstSponsorshipYear",
  "memo",
] as const

export const COMPANY_CSV_EXAMPLE_ROW = [
  "株式会社サンプル",
  "サンプル",
  "940-2188",
  "新潟県長岡市上富岡町1603-1",
  "0258-00-0000",
  "https://example.com",
  "山田太郎",
  "yamada@example.com",
  "2026",
  "",
]

/**
 * Data access for the Company domain (spec/frontend.md#Company Management).
 *
 * Modes (same convention as lib/data/sponsorship.ts, Issue #17):
 * - API mode (`NEXT_PUBLIC_API_BASE_URL` set): MySQL/API only. Errors propagate.
 * - Mock mode (env unset): in-memory mock data for local UI development.
 *
 * Never fall back from API failures to mock reads/writes.
 */

export type CompanyInput = Omit<Company, "id" | "createdAt" | "updatedAt">

export async function listCompanies(): Promise<Company[]> {
  if (isApiEnabled()) {
    return apiFetch<Company[]>("/companies")
  }
  return [...mockCompanies]
}

export async function getCompany(id: string): Promise<Company | null> {
  if (isApiEnabled()) {
    try {
      return await apiFetch<Company>(`/companies/${id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }
  return mockCompanies.find((c) => c.id === id) ?? null
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  if (isApiEnabled()) {
    return apiFetch<Company>("/companies", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }
  return addMockCompany(input)
}

export async function updateCompany(
  id: string,
  input: CompanyInput
): Promise<Company> {
  if (isApiEnabled()) {
    return apiFetch<Company>(`/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  }
  return updateMockCompany(id, input)
}

function mockBulkImportCompanies(
  rows: string[][],
  dryRun: boolean
): BulkResult<Company> {
  const headerMap = new Map(rows[0].map((header, index) => [header.trim(), index]))
  const errors: BulkError[] = []
  const valid: CompanyInput[] = []
  const csvNames = new Set<string>()
  const existingNames = new Set(mockCompanies.map((company) => company.companyName))

  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1
    const record = rows[i]
    const companyName = csvCell(record, headerMap, "companyName")
    if (!companyName) {
      errors.push({ rowNumber, message: "企業名は必須です" })
      continue
    }
    if (csvNames.has(companyName)) {
      errors.push({ rowNumber, message: "CSV内に同じ企業名が存在します" })
      continue
    }
    if (existingNames.has(companyName)) {
      errors.push({
        rowNumber,
        message: `すでに登録されている企業名です: ${companyName}`,
      })
      continue
    }

    csvNames.add(companyName)
    valid.push({
      companyName,
      companyNameKana: csvCell(record, headerMap, "companyNameKana"),
      postalCode: csvCell(record, headerMap, "postalCode"),
      address: csvCell(record, headerMap, "address"),
      phoneNumber: csvCell(record, headerMap, "phoneNumber"),
      website: csvCell(record, headerMap, "website"),
      contactPersonName: csvCell(record, headerMap, "contactPersonName"),
      contactEmailOrForm: csvCell(record, headerMap, "contactEmailOrForm"),
      firstSponsorshipYear: csvCell(record, headerMap, "firstSponsorshipYear"),
      memo: csvCell(record, headerMap, "memo"),
    })
  }

  const successfulRows: Company[] = dryRun
    ? valid.map((input) => ({
        id: "",
        ...input,
        createdAt: "",
        updatedAt: "",
      }))
    : valid.map((input) => addMockCompany(input))

  return {
    totalCount: rows.length - 1,
    successCount: successfulRows.length,
    errorCount: errors.length,
    successfulRows,
    errors,
  }
}

/**
 * POST /companies/bulk (spec/api.md#Bulk Import Companies). `dryRun: true`
 * previews without writing — the import dialog's Preview step.
 */
export async function bulkImportCompanies(
  file: File,
  dryRun: boolean
): Promise<BulkResult<Company>> {
  if (isApiEnabled()) {
    const body = new FormData()
    body.append("file", file)
    body.append("dryRun", dryRun ? "true" : "false")
    return apiFetch<BulkResult<Company>>("/companies/bulk", {
      method: "POST",
      body,
    })
  }
  const rows = parseCsv(await file.text())
  if (rows.length < 2) {
    throw new Error("CSVにヘッダーとデータ行が必要です")
  }
  return mockBulkImportCompanies(rows, dryRun)
}
