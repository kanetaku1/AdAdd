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
import { COMPANY_STATUS_LABEL } from "@/lib/yearly-company-labels"
import type { CompanyStatus } from "@/types/yearly-company"

/**
 * Inline-editable YearlyCompany.companyStatus badge (spec/frontend.md UI Principle 4).
 * Shared by Yearly Company List and Yearly Company Detail (Assignment strip).
 */
export function EditableCompanyStatusBadge({
  value,
  onChange,
  disabled,
}: {
  value: CompanyStatus
  onChange: (value: CompanyStatus) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Select
        value={value}
        defaultOpen
        onValueChange={(next) => {
          onChange(next as CompanyStatus)
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
          {Object.entries(COMPANY_STATUS_LABEL).map(([v, label]) => (
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
      variant="outline"
      className={disabled ? "opacity-50" : "cursor-pointer"}
      onClick={() => {
        if (!disabled) setEditing(true)
      }}
    >
      {COMPANY_STATUS_LABEL[value]}
    </Badge>
  )
}
