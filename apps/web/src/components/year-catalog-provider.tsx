"use client"

import { createContext, useContext, useMemo } from "react"

import { listAdvisorAssignmentsByYear } from "@/lib/data/advisor-assignments"
import {
  listContractMenusAcrossYear,
  listPaymentsByYear,
  listYearlyCompaniesByYear,
} from "@/lib/data/sponsorship"
import { listSponsorshipMenus } from "@/lib/data/sponsorship-menus"
import {
  useResourceCache,
  type ResourceCache,
} from "@/hooks/use-resource-cache"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
import type { ContractMenuAcrossYear } from "@/types/contract-menu"
import type { PaymentAcrossYear } from "@/types/payment"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"
import type { YearlyCompany } from "@/types/yearly-company"

type YearCatalogContextValue = {
  advisorAssignments: ResourceCache<AdvisorAssignment>
  sponsorshipMenus: ResourceCache<SponsorshipMenu>
  contractMenusAcrossYear: ResourceCache<ContractMenuAcrossYear>
  yearlyCompanies: ResourceCache<YearlyCompany>
  payments: ResourceCache<PaymentAcrossYear>
}

const YearCatalogContext = createContext<YearCatalogContextValue | null>(null)

/**
 * Session cache for year-scoped reference lists (Issue #82). Each resource
 * is fetched only when a screen first calls `ensure`. Mutations write
 * through via `set`; pages that change shared data call `invalidate` so the
 * next consumer re-fetches.
 */
export function YearCatalogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const advisorAssignments = useResourceCache(
    listAdvisorAssignmentsByYear,
    "アドバイザー割当の取得に失敗しました"
  )
  const sponsorshipMenus = useResourceCache(
    listSponsorshipMenus,
    "協賛メニューの取得に失敗しました"
  )
  const contractMenusAcrossYear = useResourceCache(
    listContractMenusAcrossYear,
    "契約メニュー一覧の取得に失敗しました"
  )
  const yearlyCompanies = useResourceCache(
    listYearlyCompaniesByYear,
    "年度企業一覧の取得に失敗しました"
  )
  const payments = useResourceCache(
    listPaymentsByYear,
    "入金一覧の取得に失敗しました"
  )

  const value = useMemo(
    () => ({
      advisorAssignments,
      sponsorshipMenus,
      contractMenusAcrossYear,
      yearlyCompanies,
      payments,
    }),
    [
      advisorAssignments,
      sponsorshipMenus,
      contractMenusAcrossYear,
      yearlyCompanies,
      payments,
    ]
  )

  return (
    <YearCatalogContext.Provider value={value}>
      {children}
    </YearCatalogContext.Provider>
  )
}

export function useYearCatalog() {
  const ctx = useContext(YearCatalogContext)
  if (!ctx) {
    throw new Error("useYearCatalog must be used within a YearCatalogProvider")
  }
  return ctx
}
