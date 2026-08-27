"use client"

import { useEffect, useState } from "react"

import { useActiveYear } from "@/components/active-year-provider"
import { useCurrentUser } from "@/components/current-user-provider"
import { useUsers } from "@/components/users-provider"
import { useYearCatalog } from "@/components/year-catalog-provider"
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
  removeAdvisorAssignment,
} from "@/lib/data/advisor-assignments"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"

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
  const { users, loading: usersLoading, ensureUsers } = useUsers()
  const {
    advisorAssignments,
    isAdvisorAssignmentsLoading,
    advisorAssignmentsError,
    ensureAdvisorAssignments,
    setAdvisorAssignments,
  } = useYearCatalog()
  const [error, setError] = useState<string | null>(null)
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)
  const assignments = activeYearId ? advisorAssignments(activeYearId) : []
  const catalogLoading = Boolean(
    activeYearId && isAdvisorAssignmentsLoading(activeYearId)
  )
  const loading = usersLoading || catalogLoading

  useEffect(() => {
    void ensureUsers()
  }, [ensureUsers])

  useEffect(() => {
    if (!activeYearId) return
    void ensureAdvisorAssignments(activeYearId)
  }, [activeYearId, ensureAdvisorAssignments])

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
      setAdvisorAssignments(activeYearId, [...assignments, created])
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
    if (!activeYearId) return
    setError(null)
    setBusyMemberId(memberId)
    try {
      await removeAdvisorAssignment(assignmentId)
      setAdvisorAssignments(
        activeYearId,
        assignments.filter((a) => a.id !== assignmentId)
      )
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
        <h2 className="text-lg font-medium">アドバイザー割当</h2>
        <p className="text-muted-foreground">実働メンバーへのアドバイザー割り当て</p>
      </div>

      <ErrorBanner
        message={
          yearError ||
          error ||
          (activeYearId ? advisorAssignmentsError(activeYearId) : null)
        }
      />

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
                message="年度が未作成です。年度画面から作成してください。"
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
