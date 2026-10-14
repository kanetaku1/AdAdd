"use client"

import { useEffect, useState } from "react"
import { notFound, useParams } from "next/navigation"

import { CompanyForm } from "@/components/company-form"
import { ErrorBanner, LoadingBlock } from "@/components/query-state"
import { getCompany } from "@/lib/data/companies"
import { getErrorMessage } from "@/lib/errors"
import type { Company } from "@/types/company"

/**
 * Company edit (spec/frontend.md#Company Management). Loads from the
 * browser through /api/proxy like every other screen, so the session is
 * attached in one place (spec/frontend.md#Login, Issue #152).
 */
export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>()
  // undefined: loading, null: not found
  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(companyId: string) {
      setCompany(undefined)
      setError(null)
      try {
        const loaded = await getCompany(companyId)
        if (!cancelled) setCompany(loaded)
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, { fallback: "読み込みに失敗しました" }))
        }
      }
    }
    void load(id)
    return () => {
      cancelled = true
    }
  }, [id])

  if (company === null) {
    notFound()
  }
  if (error) {
    return <ErrorBanner message={error} />
  }
  if (!company) {
    return <LoadingBlock />
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{company.companyName}</h1>
        <p className="text-muted-foreground">企業情報の編集</p>
      </div>
      <CompanyForm mode="edit" initialValue={company} />
    </div>
  )
}
