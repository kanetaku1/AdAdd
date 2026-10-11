import { expect, test, type Page } from "@playwright/test"

import { actAs, seedUsers, uniqueCompanyName, yen } from "./support"

/**
 * The core sponsorship workflow through the UI, against the real API and
 * MySQL (UC-01, UC-05, UC-06, UC-07, UC-09):
 * register a company → register it in the active Year → assign a member →
 * create a contract with menus → create the Payment → Finance confirms it.
 * Every step is checked again after a reload, so it is read back from MySQL.
 */
test.describe.serial("協賛の一連の業務フロー", () => {
  const companyName = uniqueCompanyName("フロー")

  test("企業を登録し、今年度の協賛企業に追加する", async ({ page }) => {
    await actAs(page, seedUsers.sponsorshipMember)

    await page.goto("/companies/new")
    await page.getByLabel("会社名").fill(companyName)
    await page.getByLabel("フリガナ").fill("イーツーイーフロー")
    await page.getByRole("button", { name: "登録", exact: true }).click()
    await expect(page).toHaveURL(/\/companies$/)

    const companyRow = page.getByRole("row").filter({ hasText: companyName })
    await companyRow.getByRole("button", { name: "2026年度に登録" }).click()
    await expect(companyRow.getByRole("button", { name: "2026年度に登録" })).toHaveCount(0)

    const yearlyCompanyRow = await openYearlyCompanyRow(page, companyName)
    await expect(yearlyCompanyRow.getByText("新規", { exact: true })).toBeVisible()
  })

  test("管理者が担当メンバーを割り当てる", async ({ page }) => {
    await actAs(page, seedUsers.administrator)

    let row = await openYearlyCompanyRow(page, companyName)
    await row.getByText("未割当", { exact: true }).click()
    await page.getByRole("option", { name: seedUsers.sponsorshipMember.name, exact: true }).click()
    await expect(row.getByText(seedUsers.sponsorshipMember.name, { exact: true })).toBeVisible()

    await page.reload()
    row = await openYearlyCompanyRow(page, companyName)
    await expect(row.getByText(seedUsers.sponsorshipMember.name, { exact: true })).toBeVisible()
  })

  test("協賛実働メンバーが契約と協賛メニューを作成し、入金レコードを作成する", async ({ page }) => {
    await actAs(page, seedUsers.sponsorshipMember)
    await openYearlyCompanyDetail(page, companyName)

    await page.getByRole("button", { name: "契約を作成" }).click()
    const menuRow = page.getByText("メニュー", { exact: true }).locator("xpath=ancestor::*[.//input[@type='number']][1]")
    await menuRow.getByRole("combobox").first().click()
    await page.getByRole("option", { name: "パンフレット広告 1P", exact: true }).click()
    await menuRow.getByRole("spinbutton").first().fill("2")
    await page.getByRole("button", { name: "作成する" }).click()

    // 2 × 80,000 (the menu's default price)
    await expect(page.getByText(/合計金額: [¥￥]160,000/)).toBeVisible()

    await page.getByRole("button", { name: "入金レコードを作成" }).click()
    await expect(page.getByText("入金待ち", { exact: true })).toBeVisible()

    await page.reload()
    await expect(page.getByText(/合計金額: [¥￥]160,000/)).toBeVisible()
    await expect(page.getByText("入金待ち", { exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: "パンフレット広告 1P", exact: true })).toBeVisible()
  })

  test("入金確認は財務部門だけができる", async ({ browser }) => {
    // A Sponsorship Member sees the control (development auth shows every
    // control), but the API rejects the change.
    const memberPage = await browser.newPage()
    await actAs(memberPage, seedUsers.sponsorshipMember)
    await memberPage.goto("/finance")
    let row = paymentRow(memberPage, companyName)
    await row.getByText("入金待ち", { exact: true }).click()
    await memberPage.getByRole("option", { name: "入金確認済み", exact: true }).click()
    await expect(memberPage.getByText("この操作を行う権限がありません。")).toBeVisible()
    await memberPage.reload()
    await expect(paymentRow(memberPage, companyName).getByText("入金待ち", { exact: true })).toBeVisible()
    await memberPage.close()

    const financePage = await browser.newPage()
    await actAs(financePage, seedUsers.finance)
    await financePage.goto("/finance")
    row = paymentRow(financePage, companyName)
    await expect(row.getByText(yen(160000))).toBeVisible()
    await row.getByText("入金待ち", { exact: true }).click()
    await financePage.getByRole("option", { name: "入金確認済み", exact: true }).click()
    await expect(row.getByText("入金確認済み", { exact: true })).toBeVisible()

    await financePage.reload()
    row = paymentRow(financePage, companyName)
    await expect(row.getByText("入金確認済み", { exact: true })).toBeVisible()
    await expect(row.getByText(seedUsers.finance.name, { exact: true })).toBeVisible()
    await financePage.close()
  })
})

async function openYearlyCompanyRow(page: Page, companyName: string) {
  await page.goto("/yearly-companies")
  await page.getByPlaceholder("企業名で検索").fill(companyName)
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: companyName, exact: true }) })
  await expect(row).toHaveCount(1)
  return row
}

async function openYearlyCompanyDetail(page: Page, companyName: string) {
  const row = await openYearlyCompanyRow(page, companyName)
  await row.getByRole("link", { name: companyName, exact: true }).click()
  await expect(page.getByRole("heading", { level: 1, name: companyName })).toBeVisible()
}

function paymentRow(page: Page, companyName: string) {
  return page.getByRole("row").filter({ has: page.getByRole("link", { name: companyName, exact: true }) })
}
