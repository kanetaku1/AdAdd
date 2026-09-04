/**
 * API client for AdAdd backend.
 *
 * Auth is a development stub (X-User-ID / X-User-Roles) until production auth
 * lands — see GitHub Issue #7 and apps/api AuthMiddleware.
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

/** Dev stub user ID — override via the `adadd.dev.userId` localStorage key. */
export function getCurrentDevUserId(): string {
  if (typeof window === "undefined") return "user_001"
  return window.localStorage.getItem("adadd.dev.userId") ?? "user_001"
}

/** Dev stub credentials — override via localStorage keys when needed. */
export function getDevAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {
      "X-User-ID": "user_001",
      "X-User-Roles": "ADMINISTRATOR,SPONSORSHIP_MEMBER",
    }
  }
  const roles =
    window.localStorage.getItem("adadd.dev.roles") ?? "ADMINISTRATOR,SPONSORSHIP_MEMBER"
  return {
    "X-User-ID": getCurrentDevUserId(),
    "X-User-Roles": roles,
  }
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
  const auth = getDevAuthHeaders()
  for (const [key, value] of Object.entries(auth)) {
    headers.set(key, value)
  }

  // Browser requests go through the Next.js BFF proxy (spec/frontend.md#Login)
  // rather than the Go API directly, so a logged-in session's JWT is
  // attached server-side instead of ever reaching client-side JS. Requests
  // made during SSR (Server Components) call the Go API directly — there is
  // no browser to proxy on behalf of.
  const url =
    typeof window !== "undefined" ? `/api/proxy${path}` : `${base}${path}`
  const res = await fetch(url, { ...init, headers })
  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }
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
