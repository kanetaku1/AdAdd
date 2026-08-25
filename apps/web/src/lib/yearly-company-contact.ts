import type {
  YearlyCompany,
  YearlyCompanyContact,
} from "@/types/yearly-company"

export function yearlyCompanyContact(
  yearlyCompany: YearlyCompany
): YearlyCompanyContact {
  return {
    postalCode: yearlyCompany.postalCode,
    address: yearlyCompany.address,
    phoneNumber: yearlyCompany.phoneNumber,
    website: yearlyCompany.website,
    contactPersonName: yearlyCompany.contactPersonName,
    contactEmailOrForm: yearlyCompany.contactEmailOrForm,
    memo: yearlyCompany.memo,
  }
}

/** Turns a stored website value into an href, or null when empty. */
export function websiteHref(website: string): string | null {
  const trimmed = website.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
