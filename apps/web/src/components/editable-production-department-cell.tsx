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
import {
  CONTRACT_MENU_PRODUCTION_DEPARTMENT_LABEL,
  CONTRACT_MENU_PRODUCTION_TYPE_LABEL,
} from "@/lib/contract-menu-labels"
import { cn } from "@/lib/utils"
import type {
  ContractMenuProductionDepartment,
  ContractMenuProductionType,
} from "@/types/contract-menu"

const UNASSIGNED = "UNASSIGNED"

export function EditableProductionDepartmentCell({
  productionType,
  value,
  disabled,
  onChange,
}: {
  productionType: ContractMenuProductionType | null
  value: ContractMenuProductionDepartment | null
  disabled?: boolean
  onChange: (value: ContractMenuProductionDepartment | null) => void
}) {
  const [editing, setEditing] = useState(false)

  if (productionType !== "INTERNAL") {
    return (
      <span className="text-muted-foreground">
        {productionType
          ? CONTRACT_MENU_PRODUCTION_TYPE_LABEL[productionType]
          : "-"}
      </span>
    )
  }

  if (editing) {
    return (
      <Select
        value={value ?? UNASSIGNED}
        defaultOpen
        onValueChange={(next) => {
          onChange(
            next === UNASSIGNED
              ? null
              : (next as ContractMenuProductionDepartment)
          )
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
          <SelectItem value={UNASSIGNED}>未割当</SelectItem>
          {Object.entries(CONTRACT_MENU_PRODUCTION_DEPARTMENT_LABEL).map(
            ([department, label]) => (
              <SelectItem key={department} value={department}>
                {label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    )
  }

  const label = value
    ? `委員（${CONTRACT_MENU_PRODUCTION_DEPARTMENT_LABEL[value]}）`
    : CONTRACT_MENU_PRODUCTION_TYPE_LABEL.INTERNAL

  return (
    <Badge
      variant="outline"
      title={disabled ? undefined : "クリックして制作部門を変更"}
      aria-label={`制作者 ${label}${disabled ? "" : "（変更）"}`}
      className={cn(
        "gap-1 font-normal",
        disabled ? "opacity-50" : "cursor-pointer hover:bg-muted"
      )}
      onClick={() => {
        if (!disabled) setEditing(true)
      }}
    >
      {label}
      {!disabled && (
        <ChevronsUpDown
          className="size-3 text-muted-foreground"
          aria-hidden
        />
      )}
    </Badge>
  )
}
