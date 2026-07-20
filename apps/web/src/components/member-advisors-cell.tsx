"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
}: {
  member: User
  assignments: AdvisorAssignment[]
  users: User[]
  onAdd: (advisorId: string) => void
  onRemove: (assignmentId: string) => void
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
            <button
              type="button"
              onClick={() => onRemove(assignment.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`${advisor?.name ?? "アドバイザー"}を削除`}
            >
              ×
            </button>
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAdding(true)}
          disabled={candidates.length === 0}
        >
          + 追加
        </Button>
      )}
    </div>
  )
}
