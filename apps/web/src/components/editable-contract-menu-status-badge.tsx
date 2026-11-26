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
  getContractMenuStatusLabel,
} from "@/lib/contract-menu-labels"
import type {
  ContractMenuProductionType,
  ContractMenuStatus,
} from "@/types/contract-menu"

/**
 * Inline-editable ContractMenu.status badge (spec/frontend.md UI Principle 4;
 * Contract Menu Management > Contract Menu List). Same click-to-edit pattern
 * as EditablePaymentStatusBadge/EditableProgressBadge.
 */
export function EditableContractMenuStatusBadge({
  value,
  onChange,
  disabled,
  productionType,
  availableStatuses = (Object.keys(CONTRACT_MENU_STATUS_LABEL) as ContractMenuStatus[])
    .filter((status) => status !== "SUBMITTED"),
}: {
  value: ContractMenuStatus
  onChange: (value: ContractMenuStatus) => void
  disabled?: boolean
  productionType?: ContractMenuProductionType | null
  availableStatuses?: ContractMenuStatus[]
}) {
  const [editing, setEditing] = useState(false)
  const submissionDerived = value === "SUBMITTED"
  const isEditable = !disabled && !submissionDerived

  if (editing) {
    return (
      <Select
        value={availableStatuses.includes(value) ? value : null}
        defaultOpen
        onValueChange={(next) => {
          if (availableStatuses.includes(next as ContractMenuStatus)) {
            onChange(next as ContractMenuStatus)
          }
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
          {availableStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {getContractMenuStatusLabel(status, productionType)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Badge
      variant={CONTRACT_MENU_STATUS_BADGE_VARIANT[value]}
      className={isEditable ? "cursor-pointer" : undefined}
      onClick={() => {
        if (isEditable) setEditing(true)
      }}
    >
      {getContractMenuStatusLabel(value, productionType)}
    </Badge>
  )
}
