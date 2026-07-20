import { apiFetch, isApiEnabled, ApiError } from "@/lib/api/client"
import {
  addCompany as addMockCompany,
  mockCompanies,
  updateCompany as updateMockCompany,
} from "@/lib/mock/companies"
import type { Company } from "@/types/company"

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
