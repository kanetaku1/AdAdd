import { expect, test } from "@playwright/test"

import { ApiError, NETWORK_ERROR_CODE } from "./api/client"
import { getErrorMessage } from "./errors"

// Error messages are Japanese business language (spec/frontend.md Principle 6,
// Issue #168).
test.describe("getErrorMessage", () => {
  test("the proxy could not reach the API (502 BAD_GATEWAY)", () => {
    expect(getErrorMessage(new ApiError(502, "API サーバーに接続できません。", "BAD_GATEWAY"))).toBe(
      "サーバーに接続できませんでした。時間をおいて再度お試しください。"
    )
  })

  test("the browser could not reach the web app (Failed to fetch)", () => {
    expect(getErrorMessage(new ApiError(0, "Failed to fetch", NETWORK_ERROR_CODE))).toBe(
      "サーバーに接続できませんでした。通信環境を確認してください。"
    )
  })

  test("a call-site override still wins over the generic message", () => {
    expect(
      getErrorMessage(new ApiError(409, "conflict", "CONFLICT"), { overrides: { CONFLICT: "既に契約があります。" } })
    ).toBe("既に契約があります。")
  })
})
