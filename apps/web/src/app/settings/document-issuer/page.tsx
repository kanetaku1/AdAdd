"use client"

import { Suspense } from "react"

import { useActiveYear } from "@/components/active-year-provider"
import { DocumentIssuerSection } from "@/components/settings/document-issuer-section"
import { YearSettingsFrame } from "@/components/settings/year-settings-frame"
import { LoadingBlock } from "@/components/query-state"
import { useSelectedYear } from "@/hooks/use-selected-year"

export default function DocumentIssuerSettingsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <DocumentIssuerSettingsContent />
    </Suspense>
  )
}

function DocumentIssuerSettingsContent() {
  const { refresh } = useActiveYear()
  const {
    selectedYear,
    isPastYear,
    invalidYearSelection,
    yearLoading,
    yearError,
  } = useSelectedYear()
  const error =
    yearError ||
    (invalidYearSelection ? "指定された年度が見つかりません。" : null)

  return (
    <YearSettingsFrame
      year={selectedYear}
      loading={yearLoading}
      error={error}
    >
      {selectedYear && (
        <DocumentIssuerSection
          key={selectedYear.id}
          year={selectedYear}
          isPastYear={isPastYear}
          onSaved={refresh}
        />
      )}
    </YearSettingsFrame>
  )
}
