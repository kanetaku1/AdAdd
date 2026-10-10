import type { Page } from "@playwright/test"

/**
 * Users loaded by the development seed (apps/api/internal/seed). The frontend
 * development stub sends these as X-User-ID / X-User-Roles; the Go API checks
 * the Roles. In this mode the UI shows every control regardless of Role, so
 * Role checks are verified by what the API accepts or rejects.
 */
export const seedUsers = {
  administrator: { id: "user_001", name: "田中", roles: "ADMINISTRATOR" },
  sponsorshipMember: { id: "user_002", name: "鈴木", roles: "SPONSORSHIP_MEMBER" },
  finance: { id: "user_003", name: "佐藤", roles: "FINANCE_DEPARTMENT" },
} as const

export type SeedUser = (typeof seedUsers)[keyof typeof seedUsers]

/** Acts as the given User from the next page load on. */
export async function actAs(page: Page, user: SeedUser) {
  await page.addInitScript(
    ({ id, roles }) => {
      window.localStorage.setItem("adadd.dev.userId", id)
      window.localStorage.setItem("adadd.dev.roles", roles)
    },
    { id: user.id, roles: user.roles }
  )
}

/** A company name no earlier run has used. */
export function uniqueCompanyName(label: string): string {
  return `E2E${label}株式会社 ${Date.now()}`
}

/** Matches an amount formatted as Japanese yen (half- or full-width sign). */
export function yen(amount: number): RegExp {
  return new RegExp(`[¥￥]${amount.toLocaleString("ja-JP")}`)
}
