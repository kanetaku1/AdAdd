import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/api/client"
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/lib/auth/constants"
import { exchangeCodeForTokens } from "@/lib/auth/google-oauth"
import { sessionCookieOptions } from "@/lib/auth/session"

/**
 * Google OAuth callback (spec/api.md#Login, spec/frontend.md#Login). Runs
 * entirely server-side: exchanges the authorization code for a Google
 * id_token (using GOOGLE_CLIENT_SECRET, never exposed to the browser),
 * posts it to the Go API, and stores the returned AdAdd JWT as an httpOnly
 * cookie on this origin. The browser never sees either token directly.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const state = req.nextUrl.searchParams.get("state")
  const savedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value

  if (!code || !state || !savedState || state !== savedState) {
    return redirectWithError(req, "invalid_state")
  }

  const base = getApiBaseUrl()
  if (!base) {
    return redirectWithError(req, "not_configured")
  }

  let idToken: string
  try {
    const redirectUri = new URL("/api/auth/google/callback", req.url).toString()
    const tokens = await exchangeCodeForTokens(code, redirectUri)
    idToken = tokens.id_token
  } catch {
    return redirectWithError(req, "server_error")
  }

  let apiRes: Response
  try {
    apiRes = await fetch(`${base}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })
  } catch {
    return redirectWithError(req, "server_error")
  }

  if (apiRes.status === 403) {
    return redirectWithError(req, "not_registered")
  }
  if (!apiRes.ok) {
    return redirectWithError(req, "server_error")
  }

  const body = (await apiRes.json()) as { data: { token: string } }

  const res = NextResponse.redirect(new URL("/", req.url))
  res.cookies.set(SESSION_COOKIE, body.data.token, sessionCookieOptions())
  res.cookies.delete(OAUTH_STATE_COOKIE)
  return res
}

function redirectWithError(req: NextRequest, error: string) {
  const url = new URL("/login", req.url)
  url.searchParams.set("error", error)
  const res = NextResponse.redirect(url)
  res.cookies.delete(OAUTH_STATE_COOKIE)
  return res
}
