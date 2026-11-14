import { expect, test } from "@playwright/test"

import { actAs, seedUsers, uniqueCompanyName } from "./support"

/**
 * Production type and capacity on Yearly Company Detail (Issue #162,
 * spec/frontend.md#Yearly Company Detail → Contract Menu):
 * - a Sponsorship Menu that does not require submission (the seed's 企業ブース)
 *   has no production type, shown as "-" and not editable;
 * - a quantity over `maxQuantity` (企業ブース: 8) shows a warning but can still
 *   be saved.
 */
test("提出不要のメニューは制作者を編集できず、上限を超える数量は警告だけ出る", async ({ page }) => {
  const companyName = uniqueCompanyName("制作区分")
  await actAs(page, seedUsers.administrator)

  await page.goto("/companies/new")
  await page.getByLabel("会社名").fill(companyName)
  await page.getByLabel("フリガナ").fill("イーツーイーセイサククブン")
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
  await page.getByRole("option", { name: "企業ブース", exact: true }).click()
  // No production type field for a menu that does not require submission.
  await expect(menuRow.getByText("制作者", { exact: true })).toHaveCount(0)

  await menuRow.getByRole("spinbutton").first().fill("9")
  await expect(menuRow.getByRole("status")).toContainText("上限 8 のうち")
  await page.getByRole("button", { name: "作成する" }).click()

  const boothRow = page.getByRole("row").filter({ hasText: "企業ブース" })
  await expect(boothRow).toBeVisible()
  await expect(boothRow.getByLabel(/^制作者/)).toHaveCount(0)

  // A menu that requires submission keeps an editable production type.
  await page.getByRole("button", { name: "メニューを追加" }).click()
  const addDialog = page.getByRole("dialog", { name: "メニューを追加" })
  await addDialog.getByRole("combobox").first().click()
  await page.getByRole("option", { name: "パンフレット広告 1P", exact: true }).click()
  await addDialog.getByRole("button", { name: "追加", exact: true }).click()
  await expect(addDialog).toBeHidden()
  const pamphletRow = page.getByRole("row").filter({ hasText: "パンフレット広告 1P" })
  await expect(pamphletRow.getByLabel("制作者 企業（変更）")).toBeVisible()

  // After a reload the values come back from MySQL the same way.
  await page.reload()
  await expect(page.getByRole("row").filter({ hasText: "企業ブース" }).getByLabel(/^制作者/)).toHaveCount(0)
  await expect(page.getByRole("row").filter({ hasText: "パンフレット広告 1P" }).getByLabel("制作者 企業（変更）")).toBeVisible()
})
