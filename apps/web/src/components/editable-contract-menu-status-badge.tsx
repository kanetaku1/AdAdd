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
  CONTRACT_MENU_STATUS_BADGE_VARIANT,
  CONTRACT_MENU_STATUS_LABEL,
} from "@/lib/contract-menu-labels"
import type { ContractMenuStatus } from "@/types/contract-menu"

/**
 * Inline-editable ContractMenu.status badge (spec/frontend.md UI Principle 4;
 * Contract Menu Management > Contract Menu List). Same click-to-edit pattern
 * as EditablePaymentStatusBadge/EditableProgressBadge.
 */
export function EditableContractMenuStatusBadge({
  value,
  onChange,
}: {
  value: ContractMenuStatus
  onChange: (value: ContractMenuStatus) => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Select
        value={value}
        defaultOpen
        onValueChange={(next) => {
          onChange(next as ContractMenuStatus)
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
          {Object.entries(CONTRACT_MENU_STATUS_LABEL).map(([v, label]) => (
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
      variant={CONTRACT_MENU_STATUS_BADGE_VARIANT[value]}
      className="cursor-pointer"
      onClick={() => setEditing(true)}
    >
      {CONTRACT_MENU_STATUS_LABEL[value]}
    </Badge>
  )
}
