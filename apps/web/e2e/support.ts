import { createHmac } from "node:crypto"

import type { Page } from "@playwright/test"

/**
 * JWT_SECRET of the E2E API (playwright.config.ts). Tests sign session JWTs
 * with it, exactly as POST /auth/google would issue them
 * (spec/decisions/0004-development-modes-and-sessions.md), so every request
 * takes the production session path without Google.
 */
export const e2eJwtSecret = process.env.E2E_JWT_SECRET ?? "e2e-jwt-secret"

/** The web app under test (playwright.config.ts starts it here). */
export const webBaseUrl = `http://127.0.0.1:${process.env.E2E_WEB_PORT ?? "3100"}`

/**
 * Users loaded by the development seed (apps/api/internal/seed). The API
 * reads their Roles from MySQL on every request.
 */
export const seedUsers = {
  administrator: { id: "user_001", name: "田中" },
  sponsorshipMember: { id: "user_002", name: "鈴木" },
  finance: { id: "user_003", name: "佐藤" },
  inactive: { id: "user_004", name: "高橋" },
} as const

export type SeedUser = (typeof seedUsers)[keyof typeof seedUsers]

/**
 * Signs an AdAdd session JWT (HS256, `sub` = User ID) like apps/api's
 * JWTIssuer. `issuedSecondsAgo` backdates it, e.g. to trigger renewal.
 */
export function signSessionToken(userId: string, issuedSecondsAgo = 0): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  const iat = Math.floor(Date.now() / 1000) - issuedSecondsAgo
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, iat, exp: iat + 30 * 24 * 60 * 60 })}`
  const signature = createHmac("sha256", e2eJwtSecret).update(unsigned).digest("base64url")
  return `${unsigned}.${signature}`
}

/** Acts as the given User from the next page load on, through the session cookie. */
export async function actAs(page: Page, user: SeedUser) {
  await page.context().addCookies([
    { name: "adadd_session", value: signSessionToken(user.id), url: webBaseUrl, httpOnly: true, sameSite: "Lax" },
  ])
}

/** A company name no earlier run has used. */
export function uniqueCompanyName(label: string): string {
  return `E2E${label}株式会社 ${Date.now()}`
}

/** Matches an amount formatted as Japanese yen (half- or full-width sign). */
export function yen(amount: number): RegExp {
  return new RegExp(`[¥￥]${amount.toLocaleString("ja-JP")}`)
}
