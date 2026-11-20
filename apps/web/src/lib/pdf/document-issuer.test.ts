import { expect, test } from "@playwright/test"

import { EMPTY_YEAR_DOCUMENT_ISSUER } from "@/types/year"
import {
  getDocumentIssuerStatus,
  getMissingDocumentIssuerFields,
} from "./document-issuer"

test.describe("getMissingDocumentIssuerFields", () => {
  test("requires the issuer and bank fields for invoices", () => {
    expect(getMissingDocumentIssuerFields(EMPTY_YEAR_DOCUMENT_ISSUER, "invoice")).toEqual([
      "発行者名",
      "郵便番号",
      "住所",
      "メールアドレス",
      "銀行名",
      "支店名",
      "預金種別",
      "口座番号",
      "口座名義",
    ])
  })

  test.describe("getDocumentIssuerStatus", () => {
    test("distinguishes empty, partial, and complete invoice information", () => {
      expect(getDocumentIssuerStatus(EMPTY_YEAR_DOCUMENT_ISSUER)).toBe("未設定")
      expect(
        getDocumentIssuerStatus({
          ...EMPTY_YEAR_DOCUMENT_ISSUER,
          issuerName: "Festival Committee",
        })
      ).toBe("一部入力")
      expect(
        getDocumentIssuerStatus({
          issuerName: "Festival Committee",
          issuerPostalCode: "940-2188",
          issuerAddressLine1: "Nagaoka",
          issuerAddressLine2: null,
          issuerEmail: "festival@example.com",
          bankName: "Example Bank",
          bankBranchName: "Main",
          bankAccountType: "Ordinary",
          bankAccountNumber: "1234567",
          bankAccountHolderName: "Festival",
        })
      ).toBe("設定済")
    })
  })

  test("requires only issuer fields for receipts and excludes the optional second address line", () => {
    expect(getMissingDocumentIssuerFields(EMPTY_YEAR_DOCUMENT_ISSUER, "receipt")).toEqual([
      "発行者名",
      "郵便番号",
      "住所",
      "メールアドレス",
    ])
  })

  test("treats whitespace-only values as missing", () => {
    expect(
      getMissingDocumentIssuerFields(
        { ...EMPTY_YEAR_DOCUMENT_ISSUER, issuerName: "  " },
        "receipt"
      )
    ).toContain("発行者名")
  })
})
