import { expect, test, type Browser } from "@playwright/test"

import { actAs, seedUsers, uniqueCompanyName, type SeedUser } from "./support"

/**
 * 活動記録 is for Sponsorship Member, Advisor, Advertisement Manager, and
 * Administrator (UC-14, spec/api.md#List Activity Logs for a Yearly Company,
 * Issue #167). Finance still opens Yearly Company Detail (linked from Payment
 * List) but does not see 活動記録.
 */
test.describe.serial("活動記録を見られるロール", () => {
  const companyName = uniqueCompanyName("活動記録")
  let detailPath = ""

  test("管理者が企業を登録し、担当メンバーを割り当てる", async ({ page }) => {
    await actAs(page, seedUsers.administrator)
    await page.goto("/companies/new")
    await page.getByLabel("会社名").fill(companyName)
    await page.getByLabel("フリガナ").fill("イーツーイーカツドウキロク")
    await page.getByRole("button", { name: "登録", exact: true }).click()
    await expect(page).toHaveURL(/\/companies$/)
    const companyRow = page.getByRole("row").filter({ hasText: companyName })
    await companyRow.getByRole("button", { name: "2026年度に登録" }).click()
    await expect(companyRow.getByRole("button", { name: "2026年度に登録" })).toHaveCount(0)

    await page.goto("/yearly-companies")
    await page.getByPlaceholder("企業名で検索").fill(companyName)
    const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: companyName, exact: true }) })
    await row.getByText("未割当", { exact: true }).click()
    await page.getByRole("option", { name: seedUsers.sponsorshipMember.name, exact: true }).click()
    await expect(row.getByText(seedUsers.sponsorshipMember.name, { exact: true })).toBeVisible()
    detailPath = (await row.getByRole("link", { name: companyName, exact: true }).getAttribute("href")) ?? ""
    expect(detailPath).toMatch(/^\/yearly-companies\//)
  })

  for (const [user, role] of [
    [seedUsers.advisor, "Advisor"],
    [seedUsers.sponsorshipMember, "協賛実働メンバー"],
  ] as const) {
    test(`${user.name}さん（${role}）は年度別企業詳細で活動記録を見られる`, async ({ browser }) => {
      const page = await openDetail(browser, user, detailPath, companyName)
      await page.getByRole("button", { name: /活動記録/ }).click()
      await expect(page.getByText(`担当メンバーを「${seedUsers.sponsorshipMember.name}」に設定`)).toBeVisible()
      await page.close()
    })
  }

  test(`${seedUsers.finance.name}さん（財務）は年度別企業詳細を開けるが、活動記録は出ない`, async ({ browser }) => {
    const page = await openDetail(browser, seedUsers.finance, detailPath, companyName)
    await expect(page.getByRole("heading", { level: 2, name: "契約", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /活動記録/ })).toHaveCount(0)
    await page.close()
  })
})

async function openDetail(browser: Browser, user: SeedUser, detailPath: string, companyName: string) {
  const page = await browser.newPage()
  await actAs(page, user)
  await page.goto(detailPath)
  await expect(page.getByRole("heading", { level: 1, name: companyName })).toBeVisible()
  return page
}
