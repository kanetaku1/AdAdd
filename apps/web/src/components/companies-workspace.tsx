"use client"

import { useState } from "react"

import { CompaniesTable } from "@/components/companies-table"
import { CreateCompanyButton } from "@/components/create-company-button"
import { ImportCompaniesButton } from "@/components/import-companies-button"
import { ErrorBanner } from "@/components/query-state"
import { listCompanies } from "@/lib/data/companies"
import { getErrorMessage } from "@/lib/errors"
import type { Company } from "@/types/company"

/**
 * Client shell around Company List so CSV import can refresh the table
 * from the same module that just wrote (mock) or re-fetch the API
 * (spec/frontend.md#CSV Import / Export). The page itself stays a Server
 * Component for the initial load.
 */
export function CompaniesWorkspace({
  initialCompanies,
}: {
  initialCompanies: Company[]
}) {
  const [companies, setCompanies] = useState(initialCompanies)
  const [reloadError, setReloadError] = useState<string | null>(null)

  async function reload() {
    setReloadError(null)
    try {
      setCompanies(await listCompanies())
    } catch (e) {
      setReloadError(
        getErrorMessage(e, { fallback: "一覧の更新に失敗しました" })
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">企業一覧</h1>
          <p className="text-muted-foreground">企業マスタの管理</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCompaniesButton onImported={() => void reload()} />
          <CreateCompanyButton />
        </div>
      </div>
      <ErrorBanner message={reloadError} />
      <CompaniesTable companies={companies} />
    </div>
  )
}
