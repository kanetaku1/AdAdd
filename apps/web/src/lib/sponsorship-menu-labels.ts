import type { SponsorshipMenuCategory } from "@/types/sponsorship-menu"

/**
 * UI Design Principle 2 (spec/frontend.md): show business language, not raw enum values.
 */
export const SPONSORSHIP_MENU_CATEGORY_LABEL: Record<
  SponsorshipMenuCategory,
  string
> = {
  ADVERTISEMENT: "広告",
  BOOTH: "ブース",
  WEB_LISTING: "Web掲載",
}
