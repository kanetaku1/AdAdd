"use client"

import { Badge } from "@/components/ui/badge"
import { AssignedMemberCell } from "@/components/assigned-member-cell"
import type { User } from "@/types/user"

/**
 * Assignment (担当) block on Yearly Company Detail
 * (spec/frontend.md#Yearly Company Detail → Assignment).
 * Advisors are derived client-side from the assigned member's
 * AdvisorAssignments — they are not editable here (Settings > Advisor
 * Assignments owns that).
 */
export function AssignmentSection({
  assignedMemberId,
  assignedMemberName,
  advisorNames,
  users,
  onAssign,
  disabled,
}: {
  assignedMemberId: string | null
  assignedMemberName: string | null
  advisorNames: string[]
  users: User[]
  onAssign: (userId: string | null) => void
  disabled?: boolean
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">担当</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm text-muted-foreground">
            協賛実働メンバー
          </div>
          <AssignedMemberCell
            assignedMemberId={assignedMemberId}
            assignedMemberName={assignedMemberName}
            users={users}
            onChange={onAssign}
            disabled={disabled}
          />
        </div>
        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm text-muted-foreground">
            協賛アドバイザー
          </div>
          {!assignedMemberId ? (
            <p className="text-sm text-muted-foreground">
              担当メンバー未割当のため表示できません。
            </p>
          ) : advisorNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              アドバイザー未設定です。設定は Settings &gt; Advisor Assignments
              で行います。
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {advisorNames.map((name, i) => (
                <Badge key={i} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
