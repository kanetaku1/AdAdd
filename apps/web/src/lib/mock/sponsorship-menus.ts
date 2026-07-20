import type { SponsorshipMenu } from "@/types/sponsorship-menu"

/**
 * Placeholder data matching the GET /years/{yearId}/sponsorship-menus response
 * shape (spec/api.md). Replace with a real fetch once the backend endpoint exists.
 */
export const mockSponsorshipMenus: SponsorshipMenu[] = [
  {
    id: "menu_001",
    yearId: "year_2026",
    name: "パンフレット広告 1P",
    defaultPrice: 80000,
    requiresSubmission: true,
    isActive: true,
  },
  {
    id: "menu_002",
    yearId: "year_2026",
    name: "企業ブース",
    defaultPrice: 50000,
    requiresSubmission: false,
    isActive: true,
  },
  {
    id: "menu_003",
    yearId: "year_2026",
    name: "ホームページ広告",
    defaultPrice: 15000,
    requiresSubmission: true,
    isActive: true,
  },
]

/**
 * Mutates the shared mock array so newly added/edited menus persist for the
 * rest of the browser session (spec/frontend.md#Sponsorship Menu Management).
 */
export function addSponsorshipMenu(
  input: Omit<SponsorshipMenu, "id">
): SponsorshipMenu {
  const menu: SponsorshipMenu = { id: crypto.randomUUID(), ...input }
  mockSponsorshipMenus.push(menu)
  return menu
}

export function updateSponsorshipMenu(
  id: string,
  patch: Partial<Omit<SponsorshipMenu, "id" | "yearId">>
): SponsorshipMenu {
  const menu = mockSponsorshipMenus.find((m) => m.id === id)
  if (!menu) throw new Error("sponsorship menu not found")
  Object.assign(menu, patch)
  return menu
}
