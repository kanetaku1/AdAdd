"use client"

import { Suspense } from "react"

import { useSelectedYear } from "@/hooks/use-selected-year"
import { AdvisorAssignmentsSection } from "@/components/settings/advisor-assignments-section"
import { YearSettingsFrame } from "@/components/settings/year-settings-frame"
import { LoadingBlock } from "@/components/query-state"

export default function AdvisorSettingsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdvisorSettingsContent />
    </Suspense>
  )
}

function AdvisorSettingsContent() {
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
        <AdvisorAssignmentsSection
          yearId={selectedYear.id}
          isPastYear={isPastYear}
        />
      )}
    </YearSettingsFrame>
  )
}
