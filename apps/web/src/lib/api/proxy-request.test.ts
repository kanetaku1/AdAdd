import { expect, test } from "@playwright/test"

import {
  buildProxyRequestHeaders,
  buildProxyTargetUrl,
} from "./proxy-request"

const apiBaseUrl = "http://127.0.0.1:8080"

test.describe("buildProxyTargetUrl", () => {
  test("builds a Go API URL for a normal path and keeps the query", () => {
    const target = buildProxyTargetUrl(["years", "year_2026", "companies"], "?status=NEW", apiBaseUrl)
    expect(target?.toString()).toBe("http://127.0.0.1:8080/years/year_2026/companies?status=NEW")
  })

  test("builds a URL for a single segment without a query", () => {
    expect(buildProxyTargetUrl(["users", "me"], "", apiBaseUrl)?.toString()).toBe(
      "http://127.0.0.1:8080/users/me"
    )
  })

  test("keeps the HTTPS origin of a production base URL", () => {
    const target = buildProxyTargetUrl(["companies"], "", "https://api.example.com")
    expect(target?.toString()).toBe("https://api.example.com/companies")
  })

  // Next.js decodes each catch-all segment, so these are what the route
  // receives for /api/proxy/%2Fevil.com/x, %2F%2Fevil.com, %5Cevil.com, ...
  const rejectedPaths: Array<[string, string[]]> = [
    ["%2F (decoded to a leading slash)", ["/evil.com", "x"]],
    ["%2F%2F (protocol-relative URL)", ["//evil.com", "x"]],
    ["%2F inside a segment", ["companies/evil"]],
    ["%5C (backslash)", ["\\evil.com", "x"]],
    ["%5C%5C (backslashes)", ["\\\\evil.com"]],
    ["..", ["companies", "..", "users"]],
    [".. inside a segment", ["companies", "c_001.."]],
    [".", ["companies", ".", "c_001"]],
    ["an empty segment", ["companies", "", "c_001"]],
    ["no segment", []],
  ]
  for (const [name, segments] of rejectedPaths) {
    test(`rejects ${name}`, () => {
      expect(buildProxyTargetUrl(segments, "", apiBaseUrl)).toBeNull()
    })
  }

  test("re-encodes a decoded ? or # so it stays in the path", () => {
    const target = buildProxyTargetUrl(["companies", "a?b#c"], "", apiBaseUrl)
    expect(target?.origin).toBe("http://127.0.0.1:8080")
    expect(target?.pathname).toBe("/companies/a%3Fb%23c")
    expect(target?.search).toBe("")
  })

  test("a query string never changes the origin", () => {
    const target = buildProxyTargetUrl(["companies"], "?next=//evil.com", apiBaseUrl)
    expect(target?.origin).toBe("http://127.0.0.1:8080")
  })

  test("rejects an unparsable base URL", () => {
    expect(buildProxyTargetUrl(["companies"], "", "not a url")).toBeNull()
  })
})

test.describe("buildProxyRequestHeaders", () => {
  const incoming = () =>
    new Headers({
      Accept: "application/json",
      "Content-Type": "multipart/form-data; boundary=abc",
      Authorization: "Bearer browser-supplied",
      Cookie: "adadd_session=raw-token",
      "X-User-ID": "user_001",
      "X-User-Roles": "ADMINISTRATOR",
      "X-Forwarded-Host": "evil.com",
      Host: "localhost:3000",
    })

  test("with a session: allowlisted headers and the session as Authorization", () => {
    const headers = buildProxyRequestHeaders(incoming(), "session-jwt")
    expect([...headers.entries()]).toEqual([
      ["accept", "application/json"],
      ["authorization", "Bearer session-jwt"],
      ["content-type", "multipart/form-data; boundary=abc"],
    ])
  })

  test("without a session: allowlisted headers only — no Authorization, no X-User-*", () => {
    const headers = buildProxyRequestHeaders(incoming(), undefined)
    expect([...headers.entries()]).toEqual([
      ["accept", "application/json"],
      ["content-type", "multipart/form-data; boundary=abc"],
    ])
  })

  test("omits headers the browser did not send", () => {
    const headers = buildProxyRequestHeaders(new Headers(), "session-jwt")
    expect([...headers.entries()]).toEqual([["authorization", "Bearer session-jwt"]])
  })
})
