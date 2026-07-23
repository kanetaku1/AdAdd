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
  return base ? base.replace(/\/$/, "") : null
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
      "X-User-Roles": "admin,staff",
    }
  }
  const roles =
    window.localStorage.getItem("adadd.dev.roles") ?? "admin,staff"
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
    headers.set("Content-Type", "application/json")
  }
  const auth = getDevAuthHeaders()
  for (const [key, value] of Object.entries(auth)) {
    headers.set(key, value)
  }

  const res = await fetch(`${base}${path}`, { ...init, headers })
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
    throw new ApiError(res.status, res.statusText, null, json)
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
