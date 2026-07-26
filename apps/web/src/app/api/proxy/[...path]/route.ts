import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/api/client"
import { getSessionToken } from "@/lib/auth/session"

/**
 * BFF proxy to the Go API (spec/frontend.md#Login — "the browser never
 * calls the Go API directly for authenticated requests"). apiFetch()
 * targets this route instead of the Go API directly when running in the
 * browser (lib/api/client.ts).
 *
 * When a session cookie exists, it takes over as `Authorization: Bearer`
 * and the caller's X-User-ID/X-User-Roles are stripped — the server, not
 * the client, decides who's authenticated. Without a session (nobody has
 * logged in via Google yet), whatever dev-stub headers the browser sent
 * are forwarded unchanged, preserving today's local-dev flow.
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

  const { path } = await params
  const target = new URL(`/${path.join("/")}`, base)
  target.search = req.nextUrl.search

  const headers = new Headers(req.headers)
  headers.delete("host")
  headers.delete("connection")
  headers.delete("content-length")

  const sessionToken = await getSessionToken()
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`)
    headers.delete("X-User-ID")
    headers.delete("X-User-Roles")
  }

  const hasBody = !["GET", "HEAD"].includes(req.method)
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.text() : undefined,
  })

  const responseBody = await upstream.text()
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  })
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
}
