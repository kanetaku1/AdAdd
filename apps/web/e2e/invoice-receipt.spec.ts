import { expect, test, type Page } from "@playwright/test"

import { actAs, seedUsers, uniqueCompanyName } from "./support"

/**
 * Invoice and Receipt generation (FR-015, UC-10, UC-17). The modals are
 * pre-filled from the current Contract and Payment: after the Contract Menus
 * change on the Yearly Company Detail, opening a modal again — without a
 * reload — shows the new total (Issue #158).
 */
test("メニューを変更した後に開いた請求書・領収書は、最新の合計金額になる", async ({ page }) => {
  const companyName = uniqueCompanyName("請求書")
  await actAs(page, seedUsers.administrator)

  await page.goto("/companies/new")
  await page.getByLabel("会社名").fill(companyName)
  await page.getByLabel("フリガナ").fill("イーツーイーセイキュウショ")
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

  // Open both modals once with the first total, so their earlier state exists.
  await expectInvoiceTotal(page, 80000)
  await expectReceiptAmount(page, 80000)

  // Change the Contract Menus without reloading the page.
  await page.getByRole("button", { name: "メニューを追加" }).click()
  const addDialog = page.getByRole("dialog", { name: "メニューを追加" })
  await addDialog.getByRole("combobox").first().click()
  await page.getByRole("option", { name: "ホームページ広告", exact: true }).click()
  await addDialog.getByRole("button", { name: "追加", exact: true }).click()
  await expect(addDialog).toBeHidden()
  await expect(page.getByRole("cell", { name: "ホームページ広告", exact: true })).toBeVisible()

  await expectInvoiceTotal(page, 95000)
  await expectReceiptAmount(page, 95000)
})

async function expectInvoiceTotal(page: Page, amount: number) {
  await page.getByRole("button", { name: "請求書を生成" }).click()
  const dialog = page.getByRole("dialog", { name: "請求書の生成" })
  await expect(dialog.getByLabel("合計金額")).toHaveValue(String(amount))
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
}

async function expectReceiptAmount(page: Page, amount: number) {
  await page.getByRole("button", { name: "領収書を生成" }).click()
  const dialog = page.getByRole("dialog", { name: "領収書の生成" })
  await expect(dialog.getByLabel("金額", { exact: true })).toHaveValue(String(amount))
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
}
