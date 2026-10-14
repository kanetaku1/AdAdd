/**
 * Google OAuth 2.0 Authorization Code flow (spec/frontend.md#Login). No
 * Google Workspace / hosted-domain restriction — committee members sign in
 * with ordinary personal Google accounts (spec/api.md#Login), so this only
 * proves the visitor controls that email address.
 */

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

/**
 * The account chooser is not forced: with `loginHint` (the email of the last
 * successful sign-in), a browser still signed in to that Google account
 * comes straight back (spec/frontend.md#Login).
 */
export function buildGoogleAuthUrl(
  redirectUri: string,
  state: string,
  loginHint?: string
): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured")
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  })
  if (loginHint) {
    params.set("login_hint", loginHint)
  }
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
}

/**
 * Reads the `email` claim of an id_token received directly from Google's
 * token endpoint, only to remember it as the next `login_hint`. Not a
 * verification — apps/api verifies the token before trusting it.
 */
export function emailFromIdToken(idToken: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8")
    ) as { email?: unknown }
    return typeof payload.email === "string" ? payload.email : null
  } catch {
    return null
  }
}

type GoogleTokenResponse = {
  id_token: string
  access_token: string
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET is not configured")
  }

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`)
  }
  return res.json() as Promise<GoogleTokenResponse>
}
