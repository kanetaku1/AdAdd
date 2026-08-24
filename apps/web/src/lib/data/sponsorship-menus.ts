import { apiFetch, isApiEnabled } from "@/lib/api/client"
import {
  addSponsorshipMenu as addMockSponsorshipMenu,
  mockSponsorshipMenus,
  updateSponsorshipMenu as updateMockSponsorshipMenu,
} from "@/lib/mock/sponsorship-menus"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

/**
 * Data access for the SponsorshipMenu domain
 * (spec/frontend.md#Sponsorship Menu Management).
 *
 * Modes (same convention as lib/data/sponsorship.ts, Issue #17):
 * - API mode (`NEXT_PUBLIC_API_BASE_URL` set): MySQL/API only. Errors propagate.
 * - Mock mode (env unset): in-memory mock data for local UI development.
 *
 * The backend stores defaultPrice as a decimal, which is serialized as a
 * JSON string (e.g. "5000"), not a number — every API response is mapped
 * through `Number(...)` so callers can rely on the `number` type the rest of
 * the app assumes.
 */

type ApiSponsorshipMenu = Omit<SponsorshipMenu, "defaultPrice"> & {
  defaultPrice: number | string
}

function mapApiSponsorshipMenu(raw: ApiSponsorshipMenu): SponsorshipMenu {
  return {
    ...raw,
    defaultPrice: Number(raw.defaultPrice),
    maxQuantity: raw.maxQuantity ?? null,
  }
}

export async function listSponsorshipMenus(
  yearId: string
): Promise<SponsorshipMenu[]> {
  if (isApiEnabled()) {
    const list = await apiFetch<ApiSponsorshipMenu[]>(
      `/years/${yearId}/sponsorship-menus`
    )
    return list.map(mapApiSponsorshipMenu)
  }
  return mockSponsorshipMenus.filter((m) => m.yearId === yearId)
}

export async function createSponsorshipMenu(
  yearId: string,
  input: Omit<SponsorshipMenu, "id" | "yearId">
): Promise<SponsorshipMenu> {
  if (isApiEnabled()) {
    const created = await apiFetch<ApiSponsorshipMenu>(
      `/years/${yearId}/sponsorship-menus`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    )
    return mapApiSponsorshipMenu(created)
  }
  return addMockSponsorshipMenu({ ...input, yearId })
}

/**
 * The backend PATCH replaces the editable fields (name, defaultPrice,
 * requiresSubmission, isActive, maxQuantity). Callers must send the complete
 * field set — merge the patch onto the current menu first. `yearId` is not
 * taken from the URL on update; include it so the client always has a full
 * row even though the repository does not overwrite YearID.
 */
export async function updateSponsorshipMenu(
  id: string,
  fields: Omit<SponsorshipMenu, "id">
): Promise<SponsorshipMenu> {
  if (isApiEnabled()) {
    const updated = await apiFetch<ApiSponsorshipMenu>(
      `/sponsorship-menus/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(fields),
      }
    )
    return mapApiSponsorshipMenu(updated)
  }
  return updateMockSponsorshipMenu(id, fields)
}
