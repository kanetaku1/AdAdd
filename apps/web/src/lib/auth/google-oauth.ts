/**
 * Google OAuth 2.0 Authorization Code flow (spec/frontend.md#Login). No
 * Google Workspace / hosted-domain restriction — committee members sign in
 * with ordinary personal Google accounts (spec/api.md#Login), so this only
 * proves the visitor controls that email address.
 */

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
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
    prompt: "select_account",
  })
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
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
