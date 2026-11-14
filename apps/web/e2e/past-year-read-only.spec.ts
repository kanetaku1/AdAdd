import { expect, test } from "@playwright/test"

import { actAs, seedUsers } from "./support"

test("過去年度は閲覧専用で、財務の入金確認操作は利用できる", async ({ page }) => {
  await actAs(page, seedUsers.finance)
  await page.goto("/years")

  await page.getByRole("link", { name: "2025", exact: true }).click()
  await expect(page).toHaveURL(/\/yearly-companies\?yearId=/)
  await expect(
    page.getByRole("status").filter({ hasText: "過去の年度（2025）" })
  ).toBeVisible()

  const companyRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: "株式会社長岡テクノ", exact: true }) })
  await expect(companyRow).toHaveCount(1)
  await expect(companyRow.getByText("継続", { exact: true })).toBeVisible()
  await expect(companyRow.locator("button")).toHaveCount(0)

  const yearlyCompaniesTab = page.getByRole("link", {
    name: "協賛企業(年度別)",
    exact: true,
  })
  await expect(yearlyCompaniesTab).toHaveClass(/border-sky-600/)

  await page.getByRole("link", { name: "ダッシュボード", exact: true }).click()
  await expect(page).toHaveURL(/\?yearId=/)
  await expect(page.getByText("2025年度 協賛活動サマリ")).toBeVisible()
  await expect(
    page.getByRole("status").filter({ hasText: "過去の年度（2025）" })
  ).toBeVisible()

  await page.getByRole("link", { name: "企業一覧", exact: true }).click()
  await expect(page).toHaveURL("/companies")
  await expect(
    page.getByRole("status").filter({ hasText: "過去の年度（2025）" })
  ).toHaveCount(0)
  await expect(
    page.getByRole("link", { name: "企業一覧", exact: true })
  ).not.toHaveClass(/border-sky-600/)
  await expect(page.getByText("運用中年度:")).toBeVisible()

  await page.getByRole("link", { name: "年度", exact: true }).click()
  await expect(page.getByText("表示対象", { exact: true })).toHaveCount(0)
  await page.getByRole("link", { name: "2025", exact: true }).click()
  await expect(page).toHaveURL(/\/yearly-companies\?yearId=/)
  await expect(
    page.getByRole("status").filter({ hasText: "過去の年度（2025）" })
  ).toBeVisible()

  await page.getByRole("link", { name: "財務", exact: true }).click()
  await expect(page).toHaveURL(/\/finance\?yearId=/)
  await expect(
    page.getByRole("status").filter({ hasText: "過去の年度（2025）" })
  ).toBeVisible()

  await page.getByRole("button", { name: "金額・備考" }).first().click()
  const paymentDetailsDialog = page.getByRole("dialog")
  await expect(paymentDetailsDialog.getByLabel("実入金額")).toHaveValue(/.+/)
  await expect(paymentDetailsDialog.getByLabel("備考")).toBeVisible()
  await paymentDetailsDialog.getByRole("button", { name: "キャンセル" }).click()

  const confirmedPayment = page.getByText("確認済み", { exact: true }).first()
  await expect(confirmedPayment).toBeVisible()
  await confirmedPayment.click()
  await expect(page.getByRole("option", { name: "入金待ち" })).toBeVisible()
  await page.keyboard.press("Escape")
})
