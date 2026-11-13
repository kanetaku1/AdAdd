import { expect, test, type Page } from "@playwright/test"

import { toBusinessDate } from "../src/lib/business-date"
import { actAs, seedUsers, uniqueCompanyName } from "./support"

/**
 * Receipt Timing (FR-015, UC-10, Issue #159). A receipt can be generated
 * from a WAITING Payment (face-to-face contracts), but its payment date has
 * no default and must be entered. A CONFIRMED Payment's receipt defaults to
 * the confirmation date.
 */
test("入金待ちの領収書は入金日の入力が必要で、確認済みなら確認日が入る", async ({ page }) => {
  const companyName = uniqueCompanyName("領収書")
  await actAs(page, seedUsers.administrator)

  await page.goto("/companies/new")
  await page.getByLabel("会社名").fill(companyName)
  await page.getByLabel("フリガナ").fill("イーツーイーリョウシュウショ")
  await page.getByRole("button", { name: "登録", exact: true }).click()
  await expect(page).toHaveURL(/\/companies$/)
  const companyRow = page.getByRole("row").filter({ hasText: companyName })
  await companyRow.getByRole("button", { name: "2026年度に登録" }).click()
  await expect(companyRow.getByRole("button", { name: "2026年度に登録" })).toHaveCount(0)

  await page.goto("/yearly-companies")
  await page.getByPlaceholder("企業名で検索").fill(companyName)
  await page.getByRole("link", { name: companyName, exact: true }).click()
  await expect(page.getByRole("heading", { level: 1, name: companyName })).toBeVisible()
  await page.getByRole("button", { name: "契約を作成" }).click()
  const menuRow = page.getByText("メニュー", { exact: true }).locator("xpath=ancestor::*[.//input[@type='number']][1]")
  await menuRow.getByRole("combobox").first().click()
  await page.getByRole("option", { name: "パンフレット広告 1P", exact: true }).click()
  await page.getByRole("button", { name: "作成する" }).click()
  await page.getByRole("button", { name: "入金レコードを作成" }).click()
  await expect(page.getByText("入金待ち", { exact: true })).toBeVisible()

  // WAITING: the billed amount, and no payment date until it is entered.
  let dialog = await openReceipt(page)
  await expect(dialog.getByLabel("金額", { exact: true })).toHaveValue("80000")
  await expect(dialog.getByLabel("入金日")).toHaveValue("")
  await expect(dialog.getByText("入金を受け取った日を入力してください")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "ダウンロード" })).toBeDisabled()
  await dialog.getByLabel("入金日").fill("2026-11-05")
  await expect(dialog.getByRole("button", { name: "ダウンロード" })).toBeEnabled()
  await page.keyboard.press("Escape")

  // CONFIRMED: the payment date defaults to the confirmation date.
  await page.goto("/finance")
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: companyName, exact: true }) })
  await row.getByText("入金待ち", { exact: true }).click()
  await page.getByRole("option", { name: "入金確認済み", exact: true }).click()
  await page.getByRole("dialog", { name: "入金を確認済みにしますか？" }).getByRole("button", { name: "確認済みにする" }).click()
  await expect(row.getByText("入金確認済み", { exact: true })).toBeVisible()
  const confirmedDate = toBusinessDate(new Date())

  // Read back from MySQL.
  await page.reload()
  dialog = await openReceipt(page, row)
  await expect(dialog.getByLabel("入金日")).toHaveValue(confirmedDate)
  await expect(dialog.getByRole("button", { name: "ダウンロード" })).toBeEnabled()
})

async function openReceipt(page: Page, scope = page.locator("body")) {
  await scope.getByRole("button", { name: "領収書を生成" }).click()
  const dialog = page.getByRole("dialog", { name: "領収書の生成" })
  await expect(dialog).toBeVisible()
  return dialog
}
