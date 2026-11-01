/**
 * API client for AdAdd backend.
 *
 * Requests go through /api/proxy, which attaches the session JWT
 * (spec/frontend.md#Login). No other credentials exist: the development
 * header stub was removed (spec/decisions/0004-development-modes-and-sessions.md).
 *
 * When NEXT_PUBLIC_API_BASE_URL is unset, callers should use the mock data
 * layer instead of this client.
 */

export type ApiEnvelope<T> = {
  data: T
  message?: string
}

export class ApiError extends Error {
  status: number
  code: string | null
  body: unknown

  constructor(status: number, message: string, code: string | null, body?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.body = body
  }
}

/** Standardized error envelope every 400-500 response now returns. */
type ApiErrorEnvelope = {
  error: { code: string; message: string }
}

function isApiErrorEnvelope(json: unknown): json is ApiErrorEnvelope {
  return (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error: unknown }).error === "object" &&
    (json as { error: unknown }).error !== null &&
    typeof (json as ApiErrorEnvelope).error.message === "string"
  )
}

export function getApiBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (!base) return null
  // Node fetch on Windows prefers IPv6 for "localhost". Docker Desktop's
  // published [::]:8080 often resets that connection (ECONNRESET); IPv4 works.
  return base.replace(/\/$/, "").replace("://localhost", "://127.0.0.1")
}

export function isApiEnabled(): boolean {
  return getApiBaseUrl() !== null
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError(0, "API base URL is not configured", null)
  }

  const headers = new Headers(init.headers)
  if (!headers.has("Content-Type") && init.body) {
    if (!(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json")
    }
  }
  // Requests go through the Next.js BFF proxy (spec/frontend.md#Login)
  // rather than the Go API directly, so a logged-in session's JWT is
  // attached server-side in one place instead of ever reaching client-side
  // JS. Server-side callers are refused: calling the Go API from a Server
  // Component skipped the session entirely (Issue #152).
  if (typeof window === "undefined") {
    throw new Error(
      `apiFetch(${path}) runs in the browser only — fetch from a Client Component so /api/proxy attaches the session`
    )
  }
  const res = await fetch(`/api/proxy${path}`, { ...init, headers })
  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }
  }

  // No valid session: send the user to log in instead of showing an error
  // (spec/frontend.md#Login). /login itself asks for the current user, so
  // it must not redirect to itself.
  if (res.status === 401 && window.location.pathname !== "/login") {
    window.location.assign("/login")
  }

  if (!res.ok) {
    if (isApiErrorEnvelope(json)) {
      throw new ApiError(res.status, json.error.message, json.error.code, json)
    }
    // Echo's default 404 is `{"message":"Not Found"}` (no error.code).
    // Map common statuses so getErrorMessage can show Japanese copy.
    const bodyMessage =
      typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : null
    const code =
      res.status === 404
        ? "NOT_FOUND"
        : res.status === 409
          ? "CONFLICT"
          : res.status === 403
            ? "FORBIDDEN"
            : res.status === 401
              ? "UNAUTHORIZED"
              : null
    throw new ApiError(
      res.status,
      bodyMessage || res.statusText,
      code,
      json
    )
  }

  if (
    typeof json === "object" &&
    json !== null &&
    "data" in json
  ) {
    return (json as ApiEnvelope<T>).data
  }
  return json as T
}
