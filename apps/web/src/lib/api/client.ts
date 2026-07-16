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
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export function getApiBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  return base ? base.replace(/\/$/, "") : null
}

export function isApiEnabled(): boolean {
  return getApiBaseUrl() !== null
}

/** Dev stub credentials — override via localStorage keys when needed. */
export function getDevAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {
      "X-User-ID": "user_001",
      "X-User-Roles": "admin,staff",
    }
  }
  const userId =
    window.localStorage.getItem("adadd.dev.userId") ?? "user_001"
  const roles =
    window.localStorage.getItem("adadd.dev.roles") ?? "admin,staff"
  return {
    "X-User-ID": userId,
    "X-User-Roles": roles,
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError(0, "API base URL is not configured")
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
    const errMsg =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : res.statusText
    throw new ApiError(res.status, errMsg, json)
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
