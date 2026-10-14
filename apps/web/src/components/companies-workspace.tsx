"use client"

import { useEffect, useState } from "react"

import { CompaniesTable } from "@/components/companies-table"
import { CreateCompanyButton } from "@/components/create-company-button"
import { ImportCompaniesButton } from "@/components/import-companies-button"
import { ErrorBanner, LoadingBlock } from "@/components/query-state"
import { listCompanies } from "@/lib/data/companies"
import { getErrorMessage } from "@/lib/errors"
import type { Company } from "@/types/company"

/**
 * Company List screen body. Loads from the browser through /api/proxy like
 * every other screen, so the session is attached in one place
 * (spec/frontend.md#Login, Issue #152). CSV import refreshes the table
 * from the same module that just wrote (mock) or re-fetches the API
 * (spec/frontend.md#CSV Import / Export).
 */
export function CompaniesWorkspace() {
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const list = await listCompanies()
        if (!cancelled) setCompanies(list)
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, { fallback: "読み込みに失敗しました" }))
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // After CSV import. Keeps the current list on failure.
  async function reload() {
    setError(null)
    try {
      setCompanies(await listCompanies())
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "一覧の更新に失敗しました" }))
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
      <ErrorBanner message={error} />
      {companies ? (
        <CompaniesTable companies={companies} />
      ) : (
        !error && <LoadingBlock />
      )}
    </div>
  )
}
