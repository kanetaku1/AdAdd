import { cookies } from "next/headers"

import { SESSION_COOKIE } from "@/lib/auth/constants"

// 30 days, matches the backend JWT TTL. Reset whenever the API renews the
// session (app/api/proxy), so it ends only after 30 days without use.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** Reads the AdAdd session JWT from the httpOnly cookie (server-only). */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

/**
 * Options for the session cookie, set by a route handler's response. Not
 * usable from a Server Component (Next.js only allows cookie writes from
 * Route Handlers / Server Actions) — see app/api/auth/google/callback/route.ts
 * and app/api/proxy (session renewal).
 *
 * sameSite must be "lax", not "strict": the cookie is first set on the
 * OAuth callback response, which redirects to "/" as part of a navigation
 * chain that originated cross-site (from accounts.google.com). Browsers
 * treat that follow-up redirect as cross-site too, so a Strict cookie is
 * silently dropped on it — the browser bounces back to /login even though
 * login "succeeded". Lax still gets sent on top-level GET navigations from
 * a cross-site origin, which is exactly this case, while still blocking
 * the cookie on cross-site POST/embeds (the actual CSRF vector).
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}
