import { expect, test } from "@playwright/test"

import { appUrl } from "./app-origin"

test.describe("appUrl", () => {
  test("uses APP_ORIGIN when it is set, not the request's internal host", () => {
    expect(
      appUrl("/api/auth/google/callback", "http://10.0.0.5:3000/api/auth/google", "https://adadd.example").toString()
    ).toBe("https://adadd.example/api/auth/google/callback")
  })

  test("falls back to the request's origin when APP_ORIGIN is empty", () => {
    expect(appUrl("/login", "http://127.0.0.1:3000/api/auth/google/callback?code=x", "").toString()).toBe(
      "http://127.0.0.1:3000/login"
    )
    expect(appUrl("/login", "http://127.0.0.1:3000/api/auth/google", undefined).toString()).toBe(
      "http://127.0.0.1:3000/login"
    )
  })

  test("ignores surrounding spaces and a trailing slash in APP_ORIGIN", () => {
    expect(appUrl("/", "http://internal/", " https://adadd.example/ ").toString()).toBe("https://adadd.example/")
  })
})
