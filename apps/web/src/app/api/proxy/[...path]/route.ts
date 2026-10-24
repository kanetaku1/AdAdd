import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/api/client"
import { buildProxyRequestHeaders, buildProxyTargetUrl } from "@/lib/api/proxy-request"
import { SESSION_COOKIE } from "@/lib/auth/constants"
import { getSessionToken, sessionCookieOptions } from "@/lib/auth/session"

/** Response header carrying a renewed session JWT from the Go API. */
const SESSION_TOKEN_HEADER = "X-Session-Token"

/**
 * BFF proxy to the Go API (spec/frontend.md#Login — "the browser never
 * calls the Go API directly for authenticated requests"). apiFetch()
 * targets this route instead of the Go API directly when running in the
 * browser (lib/api/client.ts).
 *
 * Only Accept and Content-Type are taken from the browser's request
 * (lib/api/proxy-request.ts). When a session cookie exists, it becomes
 * `Authorization: Bearer` — the server, not the client, decides who's
 * authenticated. Without a session (nobody has logged in via Google yet),
 * the dev-stub X-User-ID/X-User-Roles headers are forwarded, preserving
 * today's local-dev flow (to be removed in Issue #156).
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const base = getApiBaseUrl()
  if (!base) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "API base URL is not configured" } },
      { status: 500 }
    )
  }

  // Only ever forward to the Go API: the request carries the session JWT
  // (Issue #157). Next.js has already decoded each segment, so `%2F` arrives
  // here as `/` and is rejected by buildProxyTargetUrl.
  const { path } = await params
  const target = buildProxyTargetUrl(path, req.nextUrl.search, base)
  if (!target) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "invalid API path" } },
      { status: 400 }
    )
  }

  const sessionToken = await getSessionToken()
  const headers = buildProxyRequestHeaders(req.headers, sessionToken)

  const hasBody = !["GET", "HEAD"].includes(req.method)
  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody
        ? req.method === "POST" || req.method === "PUT" || req.method === "PATCH"
          ? await req.arrayBuffer()
          : undefined
        : undefined,
      // @ts-expect-error (Next.js internal fetch typing missing duplex in some versions)
      duplex: "half",
    })
  } catch (err) {
    // The API URL and the error detail stay in the server log only.
    console.error(
      `[api/proxy] Go API (${base}) に接続できません。docker compose の api が起動しているか、NEXT_PUBLIC_API_BASE_URL を確認してください。`,
      err
    )
    return NextResponse.json(
      {
        error: {
          code: "BAD_GATEWAY",
          message: "API サーバーに接続できません。",
        },
      },
      { status: 502 }
    )
  }

  const responseBody = await upstream.text()
  const res = new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  })
  // The API rejected the session (expired, or signed with another secret).
  // Drop the cookie so the login guard (proxy.ts) sends the next page load
  // to /login instead of letting it through with a dead session.
  if (upstream.status === 401 && sessionToken) {
    res.cookies.delete(SESSION_COOKIE)
  }
  // Session renewal (spec/api.md#Authentication): keep the member signed in
  // while in use. The header itself is never passed on — only Content-Type
  // is copied above — so the raw token never reaches the browser.
  const renewedToken = upstream.headers.get(SESSION_TOKEN_HEADER)
  if (renewedToken && sessionToken && upstream.status !== 401) {
    res.cookies.set(SESSION_COOKIE, renewedToken, sessionCookieOptions())
  }
  return res
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
}
