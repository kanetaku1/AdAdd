/**
 * Request rules of the /api/proxy BFF route (spec/frontend.md#Login).
 *
 * The proxy attaches the session JWT, so it must only ever reach the Go API
 * and only pass on what the Go API needs (Issue #157). Kept free of Next.js
 * imports so the rules can be unit tested.
 */

/** Request headers taken from the browser. Everything else is dropped. */
export const FORWARDED_REQUEST_HEADERS = ["Accept", "Content-Type"] as const

/**
 * Development header stub (spec/decisions/0004-development-modes-and-sessions.md).
 * Forwarded only without a session; removing it entirely is Issue #156.
 */
export const DEVELOPMENT_AUTH_HEADERS = ["X-User-ID", "X-User-Roles"] as const

/**
 * A segment Next.js has already percent-decoded is rejected when it could
 * leave the API path: `%2F` / `%5C` would become a separator (`//evil.com`
 * is a protocol-relative URL), and `.` / `..` would walk up the path.
 */
export function isAllowedProxyPathSegment(segment: string): boolean {
  if (segment === "" || segment === ".") return false
  if (segment.includes("..")) return false
  if (segment.includes("/") || segment.includes("\\")) return false
  return true
}

/**
 * Builds the Go API URL for a proxied request, or null when the request
 * must be rejected. `segments` are the decoded catch-all segments after
 * /api/proxy/, and `search` is the query string including its `?`.
 */
export function buildProxyTargetUrl(
  segments: readonly string[],
  search: string,
  apiBaseUrl: string
): URL | null {
  if (segments.length === 0) return null
  if (!segments.every(isAllowedProxyPathSegment)) return null

  let base: URL
  try {
    base = new URL(apiBaseUrl)
  } catch {
    return null
  }

  // Re-encode each segment so a decoded `?` or `#` stays part of the path.
  const path = `/${segments.map(encodeURIComponent).join("/")}`
  const target = new URL(path, base)
  if (target.origin !== base.origin) return null
  target.search = search
  return target
}

/**
 * Headers sent to the Go API. `Authorization` is never taken from the
 * browser: with a session it is set from the session cookie, without one
 * only the development header stub is passed on.
 */
export function buildProxyRequestHeaders(
  incoming: Headers,
  sessionToken: string | null | undefined
): Headers {
  const headers = new Headers()
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = incoming.get(name)
    if (value !== null) headers.set(name, value)
  }

  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`)
    return headers
  }

  for (const name of DEVELOPMENT_AUTH_HEADERS) {
    const value = incoming.get(name)
    if (value !== null) headers.set(name, value)
  }
  return headers
}
