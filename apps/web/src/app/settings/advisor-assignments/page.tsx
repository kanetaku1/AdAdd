"use client"

import { useEffect, useState } from "react"

import { useActiveYear } from "@/components/active-year-provider"
import { MemberAdvisorsCell } from "@/components/member-advisors-cell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError } from "@/lib/api/client"
import {
  addAdvisorAssignment,
  listAdvisorAssignmentsByYear,
  removeAdvisorAssignment,
} from "@/lib/data/advisor-assignments"
import { listUsers } from "@/lib/data/users"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
import type { User } from "@/types/user"

/**
 * Advisor Assignment (spec/frontend.md#Advisor Assignment, UC-03/FR-013).
 * A Sponsorship Member may have multiple Advisors at once — each chip is one
 * AdvisorAssignment row (spec/model.md#AdvisorAssignment, "no upper bound"),
 * removable independently via its own `DELETE /advisor-assignments/{id}`.
 * The Advisor dropdown is not restricted by Role — any User may act as a
 * Sponsorship Member or an Advisor, same simplification already made for the
 * assigned-member picker on /yearly-companies. Active Year comes from the
 * shared ActiveYearProvider (Issue #18).
 */
export default function AdvisorAssignmentsPage() {
  const {
    activeYear,
    loading: yearLoading,
    error: yearError,
  } = useActiveYear()
  const activeYearId = activeYear?.id ?? null

  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<AdvisorAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setUsers([])
        setAssignments([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [userList, assignmentList] = await Promise.all([
          listUsers(),
          listAdvisorAssignmentsByYear(yearId),
        ])
        if (cancelled) return
        setUsers(userList)
        setAssignments(assignmentList)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "読み込みに失敗しました")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load(activeYearId)
    return () => {
      cancelled = true
    }
  }, [activeYearId])

  async function handleAdd(memberId: string, advisorId: string) {
    if (!activeYearId) return
    setError(null)
    try {
      const created = await addAdvisorAssignment(
        activeYearId,
        memberId,
        advisorId
      )
      setAssignments((prev) => [...prev, created])
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "すでに割り当て済みです"
          : e instanceof Error
            ? e.message
            : "アドバイザーの追加に失敗しました"
      )
    }
  }

  async function handleRemove(assignmentId: string) {
    setError(null)
    try {
      await removeAdvisorAssignment(assignmentId)
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "アドバイザーの削除に失敗しました"
      )
    }
  }

  const advisorsWithMembers = users
    .filter((advisor) => assignments.some((a) => a.advisorId === advisor.id))
    .map((advisor) => ({
      advisor,
      memberNames: assignments
        .filter((a) => a.advisorId === advisor.id)
        .map(
          (a) => users.find((u) => u.id === a.memberId)?.name ?? "(不明なユーザー)"
        ),
    }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">Advisor Assignments</h2>
        <p className="text-muted-foreground">実働メンバーへのアドバイザー割り当て</p>
      </div>

      {(yearError || error) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {yearError || error}
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
            {yearLoading || loading ? (
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
              users.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <MemberAdvisorsCell
                      member={member}
                      assignments={assignments.filter(
                        (a) => a.memberId === member.id
                      )}
                      users={users}
                      onAdd={(advisorId) => void handleAdd(member.id, advisorId)}
                      onRemove={(id) => void handleRemove(id)}
                    />
                  </TableCell>
                </TableRow>
              ))
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
