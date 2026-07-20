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
  return { ...raw, defaultPrice: Number(raw.defaultPrice) }
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
 * The backend's PATCH handler binds straight into a full SponsorshipMenu and
 * `Save`s it (no fetch-then-merge) — `yearId` isn't taken from the URL here
 * the way it is for create, so omitting it would silently detach the menu
 * from its Year. Callers must always pass the complete field set (including
 * `yearId`) — merge the patch onto the current menu first.
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
