"use client"

import { useState } from "react"

import { EditableProgressBadge } from "@/components/editable-progress-badge"
import { updateProgress } from "@/lib/mock/yearly-companies"
import type { SponsorshipProgress } from "@/types/yearly-company"

/**
 * Client-state wrapper so the (server) Yearly Company Detail page can render
 * an editable, persisting progress badge without itself becoming a client
 * component — same pattern as yearly-company-assigned-member.tsx. Replaces
 * the old contract-progress-badge.tsx, which only held local state and never
 * wrote back to mockYearlyCompanies.
 */
export function YearlyCompanyProgress({
  yearlyCompanyId,
  initialProgress,
}: {
  yearlyCompanyId: string
  initialProgress: SponsorshipProgress
}) {
  const [progress, setProgress] = useState(initialProgress)

  function handleChange(value: SponsorshipProgress) {
    updateProgress(yearlyCompanyId, value)
    setProgress(value)
  }

  return <EditableProgressBadge value={progress} onChange={handleChange} />
}
