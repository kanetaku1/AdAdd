"use client"

import { useState } from "react"

import { EditableProgressBadge } from "@/components/editable-progress-badge"
import type { SponsorshipProgress } from "@/types/yearly-company"

/**
 * Client-state wrapper so the (server) Contract Detail page can render an
 * editable progress badge without itself becoming a client component.
 */
export function ContractProgressBadge({
  initialProgress,
}: {
  initialProgress: SponsorshipProgress
}) {
  const [progress, setProgress] = useState(initialProgress)
  return <EditableProgressBadge value={progress} onChange={setProgress} />
}
