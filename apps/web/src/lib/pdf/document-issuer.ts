import type { YearDocumentIssuer } from "@/types/year"

const invoiceRequiredFields: Array<[keyof YearDocumentIssuer, string]> = [
  ["issuerName", "発行者名"],
  ["issuerPostalCode", "郵便番号"],
  ["issuerAddressLine1", "住所"],
  ["issuerEmail", "メールアドレス"],
  ["bankName", "銀行名"],
  ["bankBranchName", "支店名"],
  ["bankAccountType", "預金種別"],
  ["bankAccountNumber", "口座番号"],
  ["bankAccountHolderName", "口座名義"],
]

const receiptRequiredFields: Array<[keyof YearDocumentIssuer, string]> = [
  ["issuerName", "発行者名"],
  ["issuerPostalCode", "郵便番号"],
  ["issuerAddressLine1", "住所"],
  ["issuerEmail", "メールアドレス"],
]

export function getMissingDocumentIssuerFields(
  issuer: YearDocumentIssuer,
  document: "invoice" | "receipt"
): string[] {
  const requiredFields =
    document === "invoice" ? invoiceRequiredFields : receiptRequiredFields
  return requiredFields
    .filter(([field]) => !issuer[field]?.trim())
    .map(([, label]) => label)
}

export function getDocumentIssuerStatus(
  issuer: YearDocumentIssuer
): "未設定" | "一部入力" | "設定済" {
  const missingFields = getMissingDocumentIssuerFields(issuer, "invoice")
  if (missingFields.length === 0) return "設定済"

  const hasRequiredValue = invoiceRequiredFields.some(([field]) =>
    issuer[field]?.trim()
  )
  return hasRequiredValue ? "一部入力" : "未設定"
}
