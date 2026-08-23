"use client"

import { useState } from "react"

import { Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { IconActionButton } from "@/components/icon-action-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
import type { User } from "@/types/user"

/**
 * Advisor chips + "+" add control for one Sponsorship Member
 * (spec/frontend.md#Advisor Assignment) — a Member may have multiple
 * Advisors at once, each backed by its own AdvisorAssignment row, so
 * removing one chip never affects the member's other Advisors.
 */
export function MemberAdvisorsCell({
  member,
  assignments,
  users,
  onAdd,
  onRemove,
  disabled,
}: {
  member: User
  assignments: AdvisorAssignment[]
  users: User[]
  onAdd: (advisorId: string) => void
  onRemove: (assignmentId: string) => void
  disabled?: boolean
}) {
  const [adding, setAdding] = useState(false)

  const assignedAdvisorIds = new Set(assignments.map((a) => a.advisorId))
  const candidates = users.filter(
    (u) => u.id !== member.id && !assignedAdvisorIds.has(u.id)
  )

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assignments.map((assignment) => {
        const advisor = users.find((u) => u.id === assignment.advisorId)
        return (
          <Badge key={assignment.id} variant="outline" className="gap-1">
            {advisor?.name ?? "(不明なユーザー)"}
            <IconActionButton
              label={`${advisor?.name ?? "アドバイザー"}を削除`}
              size="icon-xs"
              disabled={disabled}
              onClick={() => onRemove(assignment.id)}
            >
              <X />
            </IconActionButton>
          </Badge>
        )
      })}

      {adding ? (
        <Select
          defaultOpen
          onValueChange={(value) => {
            onAdd(value as string)
            setAdding(false)
          }}
          onOpenChange={(open) => {
            if (!open) setAdding(false)
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="選択" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <IconActionButton
          type="button"
          label="アドバイザーを追加"
          onClick={() => setAdding(true)}
          disabled={disabled || candidates.length === 0}
        >
          <Plus />
        </IconActionButton>
      )}
    </div>
  )
}
