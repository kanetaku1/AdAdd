import { NextRequest, NextResponse } from "next/server"

import { SESSION_COOKIE } from "@/lib/auth/constants"

/**
 * Route guard (spec/frontend.md#Login) — redirects to /login when there's
 * no session cookie. `NEXT_PUBLIC_DEV_AUTH_ENABLED=true` bypasses this
 * entirely, mirroring the backend's DEV_AUTH_ENABLED (apps/api
 * config.go) — local development keeps working via the X-User-ID stub
 * without requiring everyone to configure real Google OAuth credentials
 * just to click around the app.
 */
// /api/proxy is excluded too — it isn't "public", but it forwards to the Go
// API which does its own auth check. Redirecting it to the /login HTML page
// would return that page's markup where callers expect JSON.
const SKIP_GUARD_PATH_PREFIXES = ["/login", "/api/auth", "/api/proxy"]

function isMockOrDevAuth(): boolean {
  if (process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true") return true
  // No API → in-memory mocks only. Google login cannot mint a session.
  return !process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
}

export function proxy(req: NextRequest) {
  if (isMockOrDevAuth()) {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl
  if (SKIP_GUARD_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/login", req.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
