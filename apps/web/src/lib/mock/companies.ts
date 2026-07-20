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
  {
    id: "c_003",
    companyName: "信濃川建設株式会社",
    companyNameKana: "シナノガワケンセツ",
    postalCode: "940-0081",
    address: "新潟県長岡市今朝白1-1-1",
    phoneNumber: "0258-00-0002",
    website: "https://example.jp",
    contactPersonName: "鈴木一郎",
    contactEmailOrForm: "suzuki@example.jp",
    firstSponsorshipYear: "2018",
    memo: "2025年度は協賛なし(休眠)",
    createdAt: "2018-04-01T00:00:00Z",
    updatedAt: "2025-03-01T00:00:00Z",
  },
  {
    id: "c_004",
    companyName: "北越フーズ株式会社",
    companyNameKana: "ホクエツフーズ",
    postalCode: "940-2127",
    address: "新潟県長岡市関原町1-1",
    phoneNumber: "0258-00-0003",
    website: "https://example.net",
    contactPersonName: "高橋次郎",
    contactEmailOrForm: "https://example.net/contact",
    firstSponsorshipYear: "2020",
    memo: "",
    createdAt: "2020-04-01T00:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
  },
  {
    id: "c_005",
    companyName: "魚沼食品株式会社",
    companyNameKana: "ウオヌマショクヒン",
    postalCode: "940-0083",
    address: "新潟県長岡市宮原1-1-1",
    phoneNumber: "0258-00-0004",
    website: "https://example.com/uonuma",
    contactPersonName: "中村美咲",
    contactEmailOrForm: "nakamura@example.com",
    firstSponsorshipYear: "2026",
    memo: "物品協賛(自社製品)での参加",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-20T00:00:00Z",
  },
]

/**
 * Mutates the shared mock array so newly added/edited Companies persist for
 * the rest of the browser session (spec/frontend.md#Company Management).
 */
export function addCompany(
  input: Omit<Company, "id" | "createdAt" | "updatedAt">
): Company {
  const now = new Date().toISOString()
  const company: Company = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  }
  mockCompanies.push(company)
  return company
}

export function updateCompany(
  id: string,
  input: Omit<Company, "id" | "createdAt" | "updatedAt">
): Company {
  const company = mockCompanies.find((c) => c.id === id)
  if (!company) throw new Error("company not found")
  Object.assign(company, input, { updatedAt: new Date().toISOString() })
  return company
}
