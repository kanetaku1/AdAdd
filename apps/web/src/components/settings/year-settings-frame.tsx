"use client"

import type { ReactNode } from "react"

import { useCurrentUser } from "@/components/current-user-provider"
import { PastYearNotice } from "@/components/past-year-notice"
import { EmptyBlock, ErrorBanner, LoadingBlock } from "@/components/query-state"
import { canAccess } from "@/lib/auth/roles"
import type { Year } from "@/types/year"

const ADMINISTRATOR = ["ADMINISTRATOR"]

export function YearSettingsFrame({
  year,
  loading,
  error,
  children,
}: {
  year: Year | null
  loading: boolean
  error: string | null
  children: ReactNode
}) {
  const { currentUser } = useCurrentUser()

  if (!canAccess(currentUser?.roles, ADMINISTRATOR)) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        この画面を利用する権限がありません。
      </p>
    )
  }

  if (loading && !year) return <LoadingBlock />

  if (!year) {
    return error ? (
      <ErrorBanner message={error} />
    ) : (
      <EmptyBlock message="年度がありません。年度画面から作成してください。" />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PastYearNotice year={year} />
      <ErrorBanner message={error} />
      {children}
    </div>
  )
}
