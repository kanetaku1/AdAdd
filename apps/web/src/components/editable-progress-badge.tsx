"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SPONSORSHIP_PROGRESS_LABEL } from "@/lib/yearly-company-labels"
import type { SponsorshipProgress } from "@/types/yearly-company"

/**
 * Inline-editable YearlyCompany.progress badge (spec/frontend.md UI Principle 4).
 * Used on both the Yearly Companies list and Yearly Company Detail (via
 * yearly-company-progress.tsx), so progress can be updated from wherever a
 * Sponsorship Member happens to be.
 */
export function EditableProgressBadge({
  value,
  onChange,
  disabled,
}: {
  value: SponsorshipProgress
  onChange: (value: SponsorshipProgress) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Select
        value={value}
        defaultOpen
        onValueChange={(next) => {
          onChange(next as SponsorshipProgress)
          setEditing(false)
        }}
        onOpenChange={(open) => {
          if (!open) setEditing(false)
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SPONSORSHIP_PROGRESS_LABEL).map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={disabled ? "opacity-50" : "cursor-pointer"}
      onClick={() => {
        if (!disabled) setEditing(true)
      }}
    >
      {SPONSORSHIP_PROGRESS_LABEL[value]}
    </Badge>
  )
}
