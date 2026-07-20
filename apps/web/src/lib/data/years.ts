import { apiFetch, isApiEnabled } from "@/lib/api/client"
import {
  addYear as addMockYear,
  mockYears,
  registerCompanyToYear as registerMockCompanyToYear,
} from "@/lib/mock/years"
import type { Year } from "@/types/year"

/**
 * Data access for the Year domain (Issue #18).
 *
 * Modes (same convention as lib/data/sponsorship.ts, Issue #17):
 * - API mode (`NEXT_PUBLIC_API_BASE_URL` set): MySQL/API only. Errors propagate.
 * - Mock mode (env unset): in-memory mock data for local UI development.
 *
 * Never fall back from API failures to mock reads/writes.
 */

type ApiYear = {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

function mapApiYear(raw: ApiYear): Year {
  return {
    id: raw.id,
    name: raw.name,
    startDate: raw.startDate.slice(0, 10),
    endDate: raw.endDate.slice(0, 10),
    isActive: raw.isActive,
  }
}

export async function listYears(): Promise<Year[]> {
  if (isApiEnabled()) {
    const list = await apiFetch<ApiYear[]>("/years")
    return list.map(mapApiYear)
  }
  return [...mockYears]
}

/**
 * Creates a Year and makes it the active one. The backend bulk-generates a
 * Yearly Company for every existing Company as a side effect (spec/api.md
 * → Create Year); the mock branch mirrors that via addYear/registerCompanyToYear.
 */
export async function createYear(input: {
  name: string
  startDate: string
  endDate: string
}): Promise<Year> {
  if (isApiEnabled()) {
    const raw = await apiFetch<ApiYear>("/years", {
      method: "POST",
      body: JSON.stringify(input),
    })
    return mapApiYear(raw)
  }
  addMockYear(input)
  const created = mockYears.find((y) => y.isActive)
  if (!created) throw new Error("年度の作成に失敗しました")
  return created
}

/**
 * The individual, mid-cycle registration path (spec/usecase.md UC-01 Notes)
 * — distinct from the bulk registration `createYear` performs automatically.
 */
export async function registerCompanyToYear(
  companyId: string,
  yearId: string
): Promise<void> {
  if (isApiEnabled()) {
    await apiFetch(`/years/${yearId}/companies`, {
      method: "POST",
      body: JSON.stringify({ companyId }),
    })
    return
  }
  registerMockCompanyToYear(companyId, yearId)
}
