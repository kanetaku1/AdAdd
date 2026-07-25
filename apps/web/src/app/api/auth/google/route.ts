import crypto from "crypto"

import { NextRequest, NextResponse } from "next/server"

import { OAUTH_STATE_COOKIE } from "@/lib/auth/constants"
import { buildGoogleAuthUrl } from "@/lib/auth/google-oauth"

/**
 * Starts the Google OAuth Authorization Code flow (spec/api.md#Login,
 * spec/frontend.md#Login). The state cookie is verified in the callback to
 * prevent CSRF — must be SameSite=Lax (not Strict) so it's still sent when
 * Google redirects the browser back to our callback (a cross-site top-level
 * navigation).
 */
export async function GET(req: NextRequest) {
  const state = crypto.randomBytes(16).toString("hex")
  const redirectUri = new URL("/api/auth/google/callback", req.url).toString()

  let authUrl: string
  try {
    authUrl = buildGoogleAuthUrl(redirectUri, state)
  } catch {
    return NextResponse.redirect(new URL("/login?error=not_configured", req.url))
  }

  const res = NextResponse.redirect(authUrl)
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  })
  return res
}
