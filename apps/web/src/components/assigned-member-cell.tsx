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
import type { User } from "@/types/user"

const UNASSIGNED = "UNASSIGNED" as const

/**
 * Inline-editable YearlyCompany.assignedMember cell (spec/frontend.md UI
 * Principle 4) — shared by the Yearly Companies list and Yearly Company
 * Detail. Options are active Users plus the currently assigned one even if
 * it has since been disabled (so it doesn't silently vanish from its own cell).
 * `users` comes from the caller (API or mock, per lib/data/sponsorship.ts)
 * rather than being read here, so this stays mode-agnostic.
 */
export function AssignedMemberCell({
  assignedMemberId,
  assignedMemberName,
  users,
  onChange,
}: {
  assignedMemberId: string | null
  assignedMemberName: string | null
  users: User[]
  onChange: (userId: string | null) => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Select
        value={assignedMemberId ?? UNASSIGNED}
        defaultOpen
        onValueChange={(value) => {
          onChange(value === UNASSIGNED ? null : value)
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
          {users
            .filter((u) => u.isActive || u.id === assignedMemberId)
            .map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Badge
      variant="outline"
      className="cursor-pointer"
      onClick={() => setEditing(true)}
    >
      {assignedMemberName ?? "未割当"}
    </Badge>
  )
}
