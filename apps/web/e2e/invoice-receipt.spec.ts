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

  await page.goto("/years")
  const activeYearRow = page.getByRole("row").filter({ hasText: "2026" })
  await expect(activeYearRow.getByRole("cell")).toHaveCount(4)
  await expect(activeYearRow.getByRole("button")).toHaveCount(0)
  await activeYearRow.getByRole("link").click()
  await expect(page).toHaveURL(/\/yearly-companies\?yearId=year_2026/)
  await page.getByRole("link", { name: "設定" }).click()
  await expect(page).toHaveURL(/\/settings\/advisors\?yearId=year_2026/)
  await page.getByRole("link", { name: "書類発行情報" }).click()
  await expect(page).toHaveURL(/\/settings\/document-issuer\?yearId=year_2026/)
  await expect(
    page.getByRole("heading", { name: "書類発行情報", level: 2 })
  ).toBeVisible()
  const issuerValues = [
    ["発行者名（必須）", "E2E Festival Committee"],
    ["郵便番号（必須）", "940-2188"],
    ["住所（1行目）（必須）", "E2E test address"],
    ["住所（2行目）（任意）", "E2E test address line 2"],
    ["メールアドレス（必須）", "e2e@example.com"],
    ["銀行名（必須）", "E2E Bank"],
    ["支店名（必須）", "E2E Branch"],
    ["預金種別（必須）", "Ordinary"],
    ["口座番号（必須）", "1234567"],
    ["口座名義（必須）", "E2E Festival"],
  ] as const
  for (const [label, value] of issuerValues) {
    await page.getByLabel(label).fill(value)
  }
  await page.getByRole("button", { name: "書類発行情報を保存" }).click()
  await expect(page.getByText("保存しました。")).toBeVisible()
  await page.goto("/years")
  await expect(
    page.getByRole("row").filter({ hasText: "2026" }).getByRole("cell")
  ).toHaveCount(4)

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

  await page.goto("/years")
  const pastYearRow = page.getByRole("row").filter({ hasText: "2025" })
  await pastYearRow.getByRole("link").click()
  await expect(page).toHaveURL(/\/yearly-companies\?yearId=year_2025/)
  await page.getByRole("link", { name: "設定" }).click()
  await expect(page).toHaveURL(/\/settings\/advisors\?yearId=year_2025/)
  await expect(
    page.getByText("過去の年度（2025）を表示しています。変更できません。")
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "アドバイザーを追加" })).toHaveCount(0)
  await page.getByRole("link", { name: "書類発行情報" }).click()
  await expect(page).toHaveURL(/\/settings\/document-issuer\?yearId=year_2025/)
  await expect(page.getByRole("textbox")).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "書類発行情報を保存" })
  ).toHaveCount(0)
})

async function expectInvoiceTotal(page: Page, amount: number) {
  await page.getByRole("button", { name: "請求書を生成" }).click()
  const dialog = page.getByRole("dialog", { name: "請求書の生成" })
  await expect(dialog.getByLabel("合計金額")).toHaveValue(String(amount))
  await expect(dialog.getByRole("alert")).toHaveCount(0)
  await expect(dialog.getByRole("button", { name: "ダウンロード" })).toBeEnabled()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
}

async function expectReceiptAmount(page: Page, amount: number) {
  await page.getByRole("button", { name: "領収書を生成" }).click()
  const dialog = page.getByRole("dialog", { name: "領収書の生成" })
  await expect(dialog.getByLabel("金額", { exact: true })).toHaveValue(String(amount))
  await expect(dialog.getByText(/年度の発行者情報が不足しています/)).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
}
