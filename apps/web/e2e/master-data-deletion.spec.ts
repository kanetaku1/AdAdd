import { expect, test, type Page } from "@playwright/test"

import { actAs, seedUsers, uniqueCompanyName } from "./support"

/**
 * Deleting Company and Sponsorship Menu master data (spec/frontend.md#Company
 * List, #Menu Master List): Administrator-only, behind a confirmation step,
 * and rejected while the record is in use (spec/api.md#Delete Company,
 * #Delete Sponsorship Menu). Tests sign in through the session path, so the
 * UI shows controls by the User's Roles; the API's rejection of a
 * non-Administrator is covered by apps/api/internal/integration.
 */
test.describe("企業・協賛メニューの削除", () => {
  test("管理者は確認のうえ企業を削除できる", async ({ page }) => {
    const companyName = uniqueCompanyName("削除")
    await actAs(page, seedUsers.administrator)
    await registerCompany(page, companyName)

    await page.getByRole("button", { name: `${companyName}を削除` }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("企業を削除しますか？")).toBeVisible()

    // Cancelling keeps the company.
    await dialog.getByRole("button", { name: "キャンセル" }).click()
    await expect(companyRow(page, companyName)).toHaveCount(1)

    await page.getByRole("button", { name: `${companyName}を削除` }).click()
    await page.getByRole("dialog").getByRole("button", { name: "削除", exact: true }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(companyRow(page, companyName)).toHaveCount(0)

    await page.reload()
    await expect(companyRow(page, companyName)).toHaveCount(0)
  })

  test("協賛実働メンバーには企業の削除操作が出ない", async ({ page }) => {
    const companyName = uniqueCompanyName("削除権限")
    await actAs(page, seedUsers.sponsorshipMember)
    await registerCompany(page, companyName)

    // The row's other actions are there, but not delete.
    await expect(companyRow(page, companyName).getByRole("button", { name: "編集" })).toBeVisible()
    await expect(page.getByRole("button", { name: `${companyName}を削除` })).toHaveCount(0)
  })

  test("年度に登録済みの企業は削除できない", async ({ page }) => {
    const companyName = uniqueCompanyName("削除使用中")
    await actAs(page, seedUsers.administrator)
    await registerCompany(page, companyName)
    await companyRow(page, companyName).getByRole("button", { name: "2026年度に登録" }).click()
    await expect(companyRow(page, companyName).getByRole("button", { name: "2026年度に登録" })).toHaveCount(0)

    await page.getByRole("button", { name: `${companyName}を削除` }).click()
    await page.getByRole("dialog").getByRole("button", { name: "削除", exact: true }).click()
    await expect(page.getByText("年度に登録済みの企業は、協賛の履歴を残すため削除できません。")).toBeVisible()

    await page.reload()
    await expect(companyRow(page, companyName)).toHaveCount(1)
  })

  test("管理者は確認のうえ協賛メニューを削除できる", async ({ page }) => {
    const menuName = `E2E削除メニュー ${Date.now()}`
    await actAs(page, seedUsers.administrator)
    await page.goto("/sponsorship-menus")

    // Wait for the seeded menus to load before counting rows.
    const nameInputs = page.getByPlaceholder("メニュー名")
    await expect(nameInputs.first()).toBeVisible()

    // "行を追加" always creates "新規メニュー", and a Year cannot hold two
    // menus with the same name — remove one left behind by an aborted run.
    const leftover = page.getByRole("button", { name: "新規メニューを削除" })
    if (await leftover.count()) {
      await leftover.click()
      await page.getByRole("dialog").getByRole("button", { name: "削除", exact: true }).click()
      await expect(leftover).toHaveCount(0)
    }

    const before = await nameInputs.count()
    await page.getByRole("button", { name: "行を追加" }).click()
    await expect(nameInputs).toHaveCount(before + 1)
    await nameInputs.last().fill(menuName)
    await nameInputs.last().press("Enter")

    await page.reload()
    const deleteButton = page.getByRole("button", { name: `${menuName}を削除` })
    await deleteButton.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("協賛メニューを削除しますか？")).toBeVisible()
    await dialog.getByRole("button", { name: "削除", exact: true }).click()
    await expect(deleteButton).toHaveCount(0)

    await page.reload()
    await expect(page.getByPlaceholder("メニュー名").first()).toBeVisible()
    await expect(deleteButton).toHaveCount(0)
  })
})

async function registerCompany(page: Page, companyName: string) {
  await page.goto("/companies/new")
  await page.getByLabel("会社名").fill(companyName)
  await page.getByRole("button", { name: "登録", exact: true }).click()
  await expect(page).toHaveURL(/\/companies$/)
  await expect(companyRow(page, companyName)).toHaveCount(1)
}

function companyRow(page: Page, companyName: string) {
  return page.getByRole("row").filter({ hasText: companyName })
}
