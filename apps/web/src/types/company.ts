/**
 * Company (spec/model.md#Company).
 * A Company exists permanently and is independent of festival years.
 */
export type Company = {
  id: string
  companyName: string
  companyNameKana: string
  postalCode: string
  address: string
  phoneNumber: string
  website: string
  memo: string
  createdAt: string
  updatedAt: string
}
