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
    category: "ADVERTISEMENT",
    defaultPrice: 80000,
    requiresSubmission: true,
    isActive: true,
  },
  {
    id: "menu_002",
    yearId: "year_2026",
    name: "企業ブース",
    category: "BOOTH",
    defaultPrice: 50000,
    requiresSubmission: false,
    isActive: true,
  },
  {
    id: "menu_003",
    yearId: "year_2026",
    name: "Web掲載",
    category: "WEB_LISTING",
    defaultPrice: 20000,
    requiresSubmission: true,
    isActive: true,
  },
]
