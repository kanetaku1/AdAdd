import { expect, test } from "@playwright/test"

import { actAs, seedUsers } from "./support"

// The Yearly Company list shows the active Year from MySQL, with
// companyStatus computed at Year generation (spec/domain.md#Company Status).
test("協賛企業一覧に、シードした今年度の企業が継続・新規つきで表示される", async ({ page }) => {
  await actAs(page, seedUsers.sponsorshipMember)
  await page.goto("/yearly-companies")

  await expect(page.getByRole("heading", { name: "協賛企業(年度別)" })).toBeVisible()
  await expect(page.getByText("2026年度 協賛企業の管理")).toBeVisible()

  const expectations = [
    { companyName: "株式会社長岡テクノ", status: "継続" }, // contract in 2025
    { companyName: "越後電機株式会社", status: "継続" }, // contract in 2025
    { companyName: "信濃川建設株式会社", status: "新規" }, // contacted in 2025, no contract
    { companyName: "北越フーズ株式会社", status: "新規" }, // registered after 2025
  ]
  for (const { companyName, status } of expectations) {
    const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: companyName, exact: true }) })
    await expect(row).toHaveCount(1)
    await expect(row.getByText(status, { exact: true })).toBeVisible()
  }
})
