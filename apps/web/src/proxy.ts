import { NextRequest, NextResponse } from "next/server"

import { MOCK_USER_COOKIE, SESSION_COOKIE } from "@/lib/auth/constants"

/**
 * Route guard (spec/frontend.md#Login) — redirects to /login when there's
 * no session cookie: the AdAdd JWT in API mode, or the chosen mock User in
 * mock mode (spec/frontend.md#Mock mode login). There is no bypass in any
 * environment (spec/decisions/0004-development-modes-and-sessions.md).
 */
// /api/proxy is excluded too — it isn't "public", but it forwards to the Go
// API which does its own auth check. Redirecting it to the /login HTML page
// would return that page's markup where callers expect JSON.
const SKIP_GUARD_PATH_PREFIXES = ["/login", "/api/auth", "/api/proxy"]

function isMockMode(): boolean {
  return !process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (SKIP_GUARD_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (req.cookies.has(isMockMode() ? MOCK_USER_COOKIE : SESSION_COOKIE)) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/login", req.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
