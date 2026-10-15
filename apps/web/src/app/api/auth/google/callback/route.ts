import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/api/client"
import { LOGIN_HINT_COOKIE, OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/lib/auth/constants"
import { emailFromIdToken, exchangeCodeForTokens } from "@/lib/auth/google-oauth"
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
    // Forget the hinted account so the next attempt shows Google's chooser.
    const res = redirectWithError(req, "not_registered")
    res.cookies.delete(LOGIN_HINT_COOKIE)
    return res
  }
  if (!apiRes.ok) {
    return redirectWithError(req, "server_error")
  }

  const body = (await apiRes.json()) as { data: { token: string } }

  const res = NextResponse.redirect(new URL("/", req.url))
  res.cookies.set(SESSION_COOKIE, body.data.token, sessionCookieOptions())
  res.cookies.delete(OAUTH_STATE_COOKIE)
  const email = emailFromIdToken(idToken)
  if (email) {
    res.cookies.set(LOGIN_HINT_COOKIE, email, loginHintCookieOptions())
  }
  return res
}

/** Kept after logout so signing in again is quick (spec/frontend.md#Login). */
function loginHintCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  }
}

function redirectWithError(req: NextRequest, error: string) {
  const url = new URL("/login", req.url)
  url.searchParams.set("error", error)
  const res = NextResponse.redirect(url)
  res.cookies.delete(OAUTH_STATE_COOKIE)
  return res
}
