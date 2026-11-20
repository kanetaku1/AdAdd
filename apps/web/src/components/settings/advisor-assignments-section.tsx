"use client"

import { useEffect, useState } from "react"

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
import { EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import {
  addAdvisorAssignment,
  removeAdvisorAssignment,
} from "@/lib/data/advisor-assignments"
import { getErrorMessage } from "@/lib/errors"

export function AdvisorAssignmentsSection({
  yearId,
  isPastYear,
}: {
  yearId: string | null
  isPastYear: boolean
}) {
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
  const assignments = advisorAssignments(yearId)
  const catalogLoading = Boolean(
    yearId && isAdvisorAssignmentsLoading(yearId)
  )
  const loading = usersLoading || catalogLoading

  useEffect(() => {
    void ensureUsers()
  }, [ensureUsers])

  useEffect(() => {
    if (!yearId) return
    void ensureAdvisorAssignments(yearId)
  }, [yearId, ensureAdvisorAssignments])

  async function handleAdd(memberId: string, advisorId: string) {
    if (!yearId || isPastYear) return
    setError(null)
    setBusyMemberId(memberId)
    try {
      const created = await addAdvisorAssignment(yearId, memberId, advisorId)
      setAdvisorAssignments(yearId, [...assignments, created])
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
    if (!yearId || isPastYear) return
    setError(null)
    setBusyMemberId(memberId)
    try {
      await removeAdvisorAssignment(assignmentId)
      setAdvisorAssignments(
        yearId,
        assignments.filter((assignment) => assignment.id !== assignmentId)
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
    .filter((advisor) => assignments.some((assignment) => assignment.advisorId === advisor.id))
    .map((advisor) => ({
      advisor,
      memberNames: assignments
        .filter((assignment) => assignment.advisorId === advisor.id)
        .map(
          (assignment) =>
            users.find((user) => user.id === assignment.memberId)?.name ??
            "(不明なユーザー)"
        ),
    }))

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">アドバイザー割当</h2>
        <p className="text-sm text-muted-foreground">
          実働メンバーへの年度別アドバイザー割り当て
        </p>
      </div>

      <ErrorBanner
        message={error || (yearId ? advisorAssignmentsError(yearId) : null)}
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
            {loading ? (
              <LoadingRow colSpan={2} />
            ) : !yearId ? (
              <EmptyRow colSpan={2} message="年度が未作成です。年度画面から作成してください。" />
            ) : users.length === 0 ? (
              <EmptyRow colSpan={2} message="ユーザーが登録されていません。" />
            ) : (
              users.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <MemberAdvisorsCell
                      member={member}
                      assignments={assignments.filter(
                        (assignment) => assignment.memberId === member.id
                      )}
                      users={users}
                      onAdd={(advisorId) =>
                        void handleAdd(member.id, advisorId)
                      }
                      onRemove={(id) => void handleRemove(member.id, id)}
                      disabled={busyMemberId === member.id}
                      readOnly={isPastYear}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">アドバイザーごとの担当メンバー</h3>
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
    </section>
  )
}
