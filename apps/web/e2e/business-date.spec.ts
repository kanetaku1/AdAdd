import { expect, test } from "@playwright/test"

import { actAs, seedUsers, uniqueCompanyName } from "./support"

/**
 * Business dates are JST calendar days (spec/architecture.md#Time Zone).
 * At 00:30 JST it is still the previous day in UTC; the contract date and
 * the invoice dates must still be the JST day (Issue #160).
 */
test.use({ timezoneId: "Asia/Tokyo" })

test("日本時間0時台に作成しても、契約日・請求日・振込締切日は日本時間の当日になる", async ({ page }) => {
  const companyName = uniqueCompanyName("日付")
  await actAs(page, seedUsers.administrator)

  await page.goto("/companies/new")
  await page.getByLabel("会社名").fill(companyName)
  await page.getByLabel("フリガナ").fill("イーツーイーヒヅケ")
  await page.getByRole("button", { name: "登録", exact: true }).click()
  await expect(page).toHaveURL(/\/companies$/)
  const companyRow = page.getByRole("row").filter({ hasText: companyName })
  await companyRow.getByRole("button", { name: "2026年度に登録" }).click()
  await expect(companyRow.getByRole("button", { name: "2026年度に登録" })).toHaveCount(0)

  // 2026-11-04 00:30 JST = 2026-11-03 15:30 UTC.
  await page.clock.setFixedTime(new Date("2026-11-03T15:30:00Z"))

  await page.goto("/yearly-companies")
  await page.getByPlaceholder("企業名で検索").fill(companyName)
  await page.getByRole("link", { name: companyName, exact: true }).click()
  await expect(page.getByRole("heading", { level: 1, name: companyName })).toBeVisible()

  await page.getByRole("button", { name: "契約を作成" }).click()
  await expect(page.locator('input[type="date"]').first()).toHaveValue("2026-11-04")
  const menuRow = page.getByText("メニュー", { exact: true }).locator("xpath=ancestor::*[.//input[@type='number']][1]")
  await menuRow.getByRole("combobox").first().click()
  await page.getByRole("option", { name: "パンフレット広告 1P", exact: true }).click()
  await page.getByRole("button", { name: "作成する" }).click()

  // Read back from MySQL.
  await page.reload()
  await expect(page.getByText("契約日 2026-11-04")).toBeVisible()

  await page.getByRole("button", { name: "請求書を生成" }).click()
  const dialog = page.getByRole("dialog", { name: "請求書の生成" })
  await expect(dialog.getByLabel("請求日")).toHaveValue("2026-11-04")
  await expect(dialog.getByLabel("振込締切日")).toHaveValue("2026-11-18")
})
