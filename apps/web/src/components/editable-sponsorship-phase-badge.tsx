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
import {
  SPONSORSHIP_PHASE_BADGE_VARIANT,
  SPONSORSHIP_PHASE_LABEL,
} from "@/lib/yearly-company-labels"
import type { SponsorshipPhase } from "@/types/yearly-company"

/**
 * Inline-editable YearlyCompany.phase badge (spec/frontend.md UI Principle 4).
 * Shared by Yearly Company List and Yearly Company Detail (Assignment strip).
 */
export function EditableSponsorshipPhaseBadge({
  value,
  onChange,
  disabled,
}: {
  value: SponsorshipPhase
  onChange: (value: SponsorshipPhase) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Select
        value={value}
        defaultOpen
        onValueChange={(next) => {
          onChange(next as SponsorshipPhase)
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
          {Object.entries(SPONSORSHIP_PHASE_LABEL).map(([v, label]) => (
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
      variant={SPONSORSHIP_PHASE_BADGE_VARIANT[value]}
      className={disabled ? "opacity-50" : "cursor-pointer"}
      onClick={() => {
        if (!disabled) setEditing(true)
      }}
    >
      {SPONSORSHIP_PHASE_LABEL[value]}
    </Badge>
  )
}
