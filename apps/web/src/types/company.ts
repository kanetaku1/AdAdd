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
  /** Company-side contact person, stored without honorific/title. */
  contactPersonName: string
  /** Either a contact email address or an inquiry form URL. */
  contactEmailOrForm: string
  /** Preserves pre-AdAdd sponsorship history; not derived from YearlyCompany. */
  firstSponsorshipYear: string
  memo: string
  createdAt: string
  updatedAt: string
}
