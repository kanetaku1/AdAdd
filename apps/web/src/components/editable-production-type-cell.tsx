"use client"

import { useState } from "react"
import { ChevronsUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CONTRACT_MENU_PRODUCTION_TYPE_LABEL } from "@/lib/contract-menu-labels"
import { cn } from "@/lib/utils"
import type { ContractMenuProductionType } from "@/types/contract-menu"

/**
 * Inline-editable production type cell (spec/frontend.md UI Principle 4;
 * Contract Menu List / Yearly Company Detail). Null (no submission required)
 * stays as "-" and is not editable. Editable values use the same badge
 * affordance as status/progress, plus a chevron so the control reads as a
 * picker at rest.
 */
export function EditableProductionTypeCell({
  value,
  onChange,
  disabled,
}: {
  value: ContractMenuProductionType | null
  onChange: (value: ContractMenuProductionType) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (value === null) {
    return <span className="text-muted-foreground">-</span>
  }

  if (editing) {
    return (
      <Select
        value={value}
        defaultOpen
        onValueChange={(next) => {
          if (next) {
            onChange(next as ContractMenuProductionType)
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
          {Object.entries(CONTRACT_MENU_PRODUCTION_TYPE_LABEL).map(
            ([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Badge
      variant="outline"
      title={disabled ? undefined : "クリックして変更"}
      aria-label={`制作者 ${CONTRACT_MENU_PRODUCTION_TYPE_LABEL[value]}${disabled ? "" : "（変更）"}`}
      className={cn(
        "gap-1 font-normal",
        disabled ? "opacity-50" : "cursor-pointer hover:bg-muted"
      )}
      onClick={() => {
        if (!disabled) setEditing(true)
      }}
    >
      {CONTRACT_MENU_PRODUCTION_TYPE_LABEL[value]}
      {!disabled && (
        <ChevronsUpDown
          className="size-3 text-muted-foreground"
          aria-hidden
        />
      )}
    </Badge>
  )
}
