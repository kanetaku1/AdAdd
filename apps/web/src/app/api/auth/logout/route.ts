import { NextResponse } from "next/server"

import { MOCK_USER_COOKIE, SESSION_COOKIE } from "@/lib/auth/constants"

/**
 * Ends the session: the AdAdd JWT cookie, or the mock mode User cookie.
 * 303 so the browser follows the form post with a GET. The Location is
 * relative so the browser stays on the host it used (req.url can carry the
 * server's own hostname instead).
 */
export async function POST() {
  const res = new NextResponse(null, { status: 303, headers: { Location: "/login" } })
  res.cookies.delete(SESSION_COOKIE)
  res.cookies.delete(MOCK_USER_COOKIE)
  return res
}
