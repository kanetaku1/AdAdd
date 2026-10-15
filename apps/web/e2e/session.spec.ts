import { expect, test } from "@playwright/test"

import { actAs, seedUsers, signSessionToken, webBaseUrl } from "./support"

/**
 * The session path (spec/frontend.md#Login, Issue #152): every screen reaches
 * the API through /api/proxy with the session cookie, and the API reads the
 * User and its Roles from MySQL on every request.
 */
test.describe("セッション", () => {
  test("セッションが無いと、ログイン画面に誘導される", async ({ page }) => {
    await page.goto("/companies")
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText("Googleでログイン")).toBeVisible()
  })

  test("ログインしていると、企業一覧と企業編集を表示できる", async ({ page }) => {
    await actAs(page, seedUsers.sponsorshipMember)

    await page.goto("/companies")
    const row = page.getByRole("row").filter({ hasText: "株式会社長岡テクノ" })
    await expect(row).toHaveCount(1)

    await row.getByRole("button", { name: "編集" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "株式会社長岡テクノ" })).toBeVisible()
    await expect(page.getByLabel("会社名")).toHaveValue("株式会社長岡テクノ")
  })

  test("API にセッションを拒否されると、ログイン画面に誘導される", async ({ page }) => {
    // A cookie the API cannot verify (expired, or signed with another secret).
    await page.context().addCookies([{ name: "adadd_session", value: "not-a-valid-token", url: webBaseUrl }])

    await page.goto("/companies")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("使っている間はセッションが延長される", async ({ page }) => {
    // Issued two days ago: older than the one-day renewal threshold.
    const oldToken = signSessionToken(seedUsers.sponsorshipMember.id, 2 * 24 * 60 * 60)
    await page.context().addCookies([{ name: "adadd_session", value: oldToken, url: webBaseUrl, httpOnly: true }])

    await page.goto("/companies")
    await expect(page.getByRole("row").filter({ hasText: "株式会社長岡テクノ" })).toHaveCount(1)

    const session = (await page.context().cookies(webBaseUrl)).find((cookie) => cookie.name === "adadd_session")
    expect(session?.value).toBeTruthy()
    expect(session?.value).not.toBe(oldToken)
    // Renewed for another 30 days.
    expect(session!.expires * 1000).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000)
  })

  test("無効化されたユーザーのセッションは、ログイン画面に誘導される", async ({ page }) => {
    // A correctly signed session for a User whose access was removed.
    await actAs(page, seedUsers.inactive)

    await page.goto("/companies")
    await expect(page).toHaveURL(/\/login$/)
  })
})
