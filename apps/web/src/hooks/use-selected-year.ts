"use client"

import { useSearchParams } from "next/navigation"

import { useActiveYear } from "@/components/active-year-provider"

export function useSelectedYear() {
  const searchParams = useSearchParams()
  const { years, activeYear, loading, error } = useActiveYear()
  const requestedYearId = searchParams.get("yearId")
  const selectedYear = requestedYearId
    ? years.find((year) => year.id === requestedYearId) ?? null
    : activeYear
  const invalidYearSelection =
    Boolean(requestedYearId) && !loading && selectedYear === null

  return {
    selectedYear,
    selectedYearId: selectedYear?.id ?? null,
    isPastYear: selectedYear !== null && !selectedYear.isActive,
    invalidYearSelection,
    yearLoading: loading,
    yearError: error,
  }
}
