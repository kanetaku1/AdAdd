"use client"

import { useState } from "react"

import { useActiveYear } from "@/components/active-year-provider"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  assignAdvisor,
  mockAdvisorAssignments,
} from "@/lib/mock/advisor-assignments"
import { mockUsers } from "@/lib/mock/users"

const UNASSIGNED = "UNASSIGNED" as const

/**
 * Advisor Assignment (spec/frontend.md#Settings > Advisor Assignment,
 * UC-03/FR-013). The Advisor dropdown is not restricted by Role — any User
 * may act as a Sponsorship Member or an Advisor — same simplification
 * already made for the assigned-member picker on /yearly-companies. Active
 * Year comes from the shared ActiveYearProvider (Issue #18).
 *
 * TODO: replace mockAdvisorAssignments with GET /advisor-assignments, and
 * wire edits to POST /advisor-assignments once the backend endpoints exist
 * (spec/api.md).
 */
export default function AdvisorAssignmentsPage() {
  const {
    activeYear,
    loading: yearLoading,
    error: yearError,
  } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const [assignments, setAssignments] = useState(mockAdvisorAssignments)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  function advisorIdFor(memberId: string): string | null {
    return (
      assignments.find(
        (a) => a.yearId === activeYearId && a.memberId === memberId
      )?.advisorId ?? null
    )
  }

  function handleChange(memberId: string, advisorId: string | null) {
    if (!activeYearId) return
    assignAdvisor(activeYearId, memberId, advisorId)
    setAssignments([...mockAdvisorAssignments])
    setEditingMemberId(null)
  }

  function advisorName(id: string | null): string | null {
    if (!id) return null
    return mockUsers.find((u) => u.id === id)?.name ?? "(不明なユーザー)"
  }

  const advisorsWithMembers = mockUsers
    .filter((advisor) =>
      assignments.some(
        (a) => a.yearId === activeYearId && a.advisorId === advisor.id
      )
    )
    .map((advisor) => ({
      advisor,
      memberNames: assignments
        .filter((a) => a.yearId === activeYearId && a.advisorId === advisor.id)
        .map((a) => mockUsers.find((u) => u.id === a.memberId)?.name ?? "(不明なユーザー)"),
    }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">Advisor Assignments</h2>
        <p className="text-muted-foreground">実働メンバーへのアドバイザー割り当て</p>
      </div>

      {yearError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {yearError}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>実働メンバー</TableHead>
              <TableHead>アドバイザー</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : !activeYearId ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  年度が未作成です。Years から年度を作成してください。
                </TableCell>
              </TableRow>
            ) : (
              mockUsers.map((member) => {
              const currentAdvisorId = advisorIdFor(member.id)
              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="rounded">
                    {editingMemberId === member.id ? (
                      <Select
                        value={currentAdvisorId ?? UNASSIGNED}
                        defaultOpen
                        onValueChange={(value) =>
                          handleChange(
                            member.id,
                            value === UNASSIGNED ? null : value
                          )
                        }
                        onOpenChange={(open) => {
                          if (!open) setEditingMemberId(null)
                        }}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>未設定</SelectItem>
                          {mockUsers
                            .filter((u) => u.id !== member.id)
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setEditingMemberId(member.id)}
                      >
                        {advisorName(currentAdvisorId) ?? "未設定"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">アドバイザーごとの担当メンバー</h2>
        <div className="flex flex-col gap-2 rounded-md border p-4 text-sm">
          {advisorsWithMembers.length === 0 ? (
            <p className="text-muted-foreground">割り当てはまだありません</p>
          ) : (
            advisorsWithMembers.map(({ advisor, memberNames }) => (
              <div key={advisor.id}>
                <span className="font-medium">{advisor.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {memberNames.join("、")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
