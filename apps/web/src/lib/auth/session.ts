import { cookies } from "next/headers"

import { SESSION_COOKIE } from "@/lib/auth/constants"

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days, matches the backend JWT TTL

/** Reads the AdAdd session JWT from the httpOnly cookie (server-only). */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

/**
 * Sets the session cookie on a route handler's response. Not usable from a
 * Server Component (Next.js only allows cookie writes from Route Handlers /
 * Server Actions) — see app/api/auth/google/callback/route.ts.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}
