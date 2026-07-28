"use client"

import { useEffect, useState } from "react"

import { useActiveYear } from "@/components/active-year-provider"
import { useCurrentUser } from "@/components/current-user-provider"
import { MemberAdvisorsCell } from "@/components/member-advisors-cell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyBlock, EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import {
  addAdvisorAssignment,
  listAdvisorAssignmentsByYear,
  removeAdvisorAssignment,
} from "@/lib/data/advisor-assignments"
import { listUsers } from "@/lib/data/users"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
import type { User } from "@/types/user"

const ALLOWED_ROLES = ["ADMINISTRATOR"]

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
  const { currentUser } = useCurrentUser()
  const canManageAssignments = canAccess(currentUser?.roles, ALLOWED_ROLES)

  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<AdvisorAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)

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
          setError(getErrorMessage(e, { fallback: "読み込みに失敗しました" }))
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
    setBusyMemberId(memberId)
    try {
      const created = await addAdvisorAssignment(
        activeYearId,
        memberId,
        advisorId
      )
      setAssignments((prev) => [...prev, created])
    } catch (e) {
      setError(
        getErrorMessage(e, {
          fallback: "アドバイザーの追加に失敗しました",
          overrides: { CONFLICT: "すでに割り当て済みです" },
        })
      )
    } finally {
      setBusyMemberId(null)
    }
  }

  async function handleRemove(memberId: string, assignmentId: string) {
    setError(null)
    setBusyMemberId(memberId)
    try {
      await removeAdvisorAssignment(assignmentId)
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    } catch (e) {
      setError(
        getErrorMessage(e, { fallback: "アドバイザーの削除に失敗しました" })
      )
    } finally {
      setBusyMemberId(null)
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

  if (!canManageAssignments) {
    return <EmptyBlock message="この画面を利用する権限がありません。" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">Advisor Assignments</h2>
        <p className="text-muted-foreground">実働メンバーへのアドバイザー割り当て</p>
      </div>

      <ErrorBanner message={yearError || error} />

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
              <LoadingRow colSpan={2} />
            ) : !activeYearId ? (
              <EmptyRow
                colSpan={2}
                message="年度が未作成です。Years から年度を作成してください。"
              />
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
                      onRemove={(id) => void handleRemove(member.id, id)}
                      disabled={busyMemberId === member.id}
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
