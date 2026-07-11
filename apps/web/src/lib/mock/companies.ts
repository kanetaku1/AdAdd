import type { Company } from "@/types/company"

/**
 * Placeholder data matching the GET /companies response shape (spec/api.md).
 * Replace with a real fetch to the API once the backend Company endpoints exist.
 */
export const mockCompanies: Company[] = [
  {
    id: "c_001",
    companyName: "株式会社長岡テクノ",
    companyNameKana: "ナガオカテクノ",
    postalCode: "940-2188",
    address: "新潟県長岡市上富岡町1603-1",
    phoneNumber: "0258-00-0000",
    website: "https://example.com",
    contactPersonName: "山田太郎",
    contactEmailOrForm: "yamada@example.com",
    firstSponsorshipYear: "2015",
    memo: "継続協賛企業",
    createdAt: "2025-04-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "c_002",
    companyName: "越後電機株式会社",
    companyNameKana: "エチゴデンキ",
    postalCode: "940-0062",
    address: "新潟県長岡市大手通1-1",
    phoneNumber: "0258-00-0001",
    website: "https://example.org",
    contactPersonName: "佐藤花子",
    contactEmailOrForm: "https://example.org/contact",
    firstSponsorshipYear: "2026",
    memo: "",
    createdAt: "2026-05-10T00:00:00Z",
    updatedAt: "2026-05-10T00:00:00Z",
  },
]
