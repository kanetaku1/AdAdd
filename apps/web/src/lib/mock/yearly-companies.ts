import type { YearlyCompany } from "@/types/yearly-company"

/**
 * Placeholder data matching the GET /years/{yearId}/companies response shape (spec/api.md).
 * Replace with a real fetch to the API once the backend YearlyCompany endpoints exist.
 */
export const mockYearlyCompanies: YearlyCompany[] = [
  {
    id: "yc_001",
    yearId: "year_2026",
    companyId: "c_001",
    companyName: "株式会社長岡テクノ",
    companyStatus: "CONTINUING",
    phase: "PHASE_1",
    progress: "INVOICE_SENT",
    assignedMemberName: "田中",
    notes: "",
  },
  {
    id: "yc_002",
    yearId: "year_2026",
    companyId: "c_002",
    companyName: "越後電機株式会社",
    companyStatus: "NEW",
    phase: "PHASE_2",
    progress: "MATERIALS_SENT",
    assignedMemberName: "鈴木",
    notes: "",
  },
  {
    id: "yc_003",
    yearId: "year_2026",
    companyId: "c_003",
    companyName: "信濃川建設株式会社",
    companyStatus: "DORMANT",
    phase: "PHASE_3",
    progress: "NOT_CONTACTED",
    assignedMemberName: null,
    notes: "昨年度は協賛なし",
  },
  {
    id: "yc_004",
    yearId: "year_2026",
    companyId: "c_004",
    companyName: "北越フーズ株式会社",
    companyStatus: "CONTINUING",
    phase: "PHASE_1",
    progress: "PAYMENT_RECEIVED",
    assignedMemberName: "田中",
    notes: "",
  },
]
