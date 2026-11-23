/**
 * Year (spec/model.md#Year) — one festival cycle. Only one Year is active
 * (isActive) at a time; every other business object is scoped to a Year.
 */
export type Year = {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  editionNumber: number | null
} & YearDocumentIssuer

export type YearDocumentIssuer = {
  issuerName: string | null
  issuerPostalCode: string | null
  issuerAddressLine1: string | null
  issuerAddressLine2: string | null
  issuerEmail: string | null
  bankName: string | null
  bankBranchName: string | null
  bankAccountType: string | null
  bankAccountNumber: string | null
  bankAccountHolderName: string | null
}

export const EMPTY_YEAR_DOCUMENT_ISSUER: YearDocumentIssuer = {
  issuerName: null,
  issuerPostalCode: null,
  issuerAddressLine1: null,
  issuerAddressLine2: null,
  issuerEmail: null,
  bankName: null,
  bankBranchName: null,
  bankAccountType: null,
  bankAccountNumber: null,
  bankAccountHolderName: null,
}
