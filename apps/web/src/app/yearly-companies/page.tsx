"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

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
import { useActiveYear } from "@/components/active-year-provider"
import { EditableProgressBadge } from "@/components/editable-progress-badge"
import { isApiEnabled } from "@/lib/api/client"
import {
  assignMember,
  listUsers,
  listYearlyCompaniesByYear,
  updateYearlyCompanyPhase,
  updateYearlyCompanyProgress,
  updateYearlyCompanyStatus,
} from "@/lib/data/sponsorship"
import {
  COMPANY_STATUS_LABEL,
  SPONSORSHIP_PHASE_BADGE_VARIANT,
  SPONSORSHIP_PHASE_LABEL,
  SPONSORSHIP_PROGRESS_LABEL,
} from "@/lib/yearly-company-labels"
import type { User } from "@/types/user"
import type {
  CompanyStatus,
  SponsorshipPhase,
  SponsorshipProgress,
  YearlyCompany,
} from "@/types/yearly-company"

const ALL = "ALL" as const
const UNASSIGNED = "UNASSIGNED" as const

type EditableColumn = "companyStatus" | "phase" | "assignedMember"

/**
 * Yearly Company List (spec/frontend.md#Yearly Company Management).
 */
export default function YearlyCompaniesPage() {
  const {
    activeYear,
    loading: yearLoading,
    error: yearError,
  } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const [rows, setRows] = useState<YearlyCompany[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [companyStatusFilter, setCompanyStatusFilter] = useState<
    CompanyStatus | typeof ALL
  >(ALL)
  const [phaseFilter, setPhaseFilter] = useState<SponsorshipPhase | typeof ALL>(
    ALL
  )
  const [progressFilter, setProgressFilter] = useState<
    SponsorshipProgress | typeof ALL
  >(ALL)
  const [editingCell, setEditingCell] = useState<{
    id: string
    column: EditableColumn
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setRows([])
        setUsers([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [list, userList] = await Promise.all([
          listYearlyCompaniesByYear(yearId),
          listUsers(),
        ])
        if (cancelled) return
        setRows(list)
        setUsers(userList)
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setUsers([])
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

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (yc) =>
          yc.yearId === activeYearId &&
          (companyStatusFilter === ALL ||
            yc.companyStatus === companyStatusFilter) &&
          (phaseFilter === ALL || yc.phase === phaseFilter) &&
          (progressFilter === ALL || yc.progress === progressFilter)
      ),
    [rows, activeYearId, companyStatusFilter, phaseFilter, progressFilter]
  )

  async function setCompanyStatus(id: string, value: CompanyStatus) {
    setActionError(null)
    try {
      await updateYearlyCompanyStatus(id, value)
      setRows((prev) =>
        prev.map((yc) => (yc.id === id ? { ...yc, companyStatus: value } : yc))
      )
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "ステータスの更新に失敗しました"
      )
    }
  }

  async function setPhase(id: string, value: SponsorshipPhase) {
    setActionError(null)
    try {
      await updateYearlyCompanyPhase(id, value)
      setRows((prev) =>
        prev.map((yc) => (yc.id === id ? { ...yc, phase: value } : yc))
      )
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "フェーズの更新に失敗しました"
      )
    }
  }

  async function setProgress(id: string, value: SponsorshipProgress) {
    setActionError(null)
    try {
      await updateYearlyCompanyProgress(id, value)
      setRows((prev) =>
        prev.map((yc) => (yc.id === id ? { ...yc, progress: value } : yc))
      )
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "進捗の更新に失敗しました"
      )
    }
  }

  async function setAssignedMember(id: string, userId: string | null) {
    setActionError(null)
    try {
      await assignMember(id, userId)
      setRows((prev) =>
        prev.map((yc) =>
          yc.id === id
            ? {
                ...yc,
                assignedMemberId: userId,
                assignedMemberName:
                  users.find((u) => u.id === userId)?.name ?? null,
              }
            : yc
        )
      )
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "担当メンバーの更新に失敗しました"
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Yearly Companies</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}年度 協賛企業の管理
        </p>
      </div>

      {!isApiEnabled() && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          開発モード: mock データを使用（`NEXT_PUBLIC_API_BASE_URL` で API 接続）。
        </p>
      )}

      {(yearError || error) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {yearError || error}
        </p>
      )}

      {actionError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={companyStatusFilter}
          onValueChange={(value) =>
            setCompanyStatusFilter(value as CompanyStatus | typeof ALL)
          }
          items={{ [ALL]: "すべてのステータス", ...COMPANY_STATUS_LABEL }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="企業ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべてのステータス</SelectItem>
            {Object.entries(COMPANY_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={phaseFilter}
          onValueChange={(value) =>
            setPhaseFilter(value as SponsorshipPhase | typeof ALL)
          }
          items={{ [ALL]: "すべてのフェーズ", ...SPONSORSHIP_PHASE_LABEL }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="フェーズ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべてのフェーズ</SelectItem>
            {Object.entries(SPONSORSHIP_PHASE_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={progressFilter}
          onValueChange={(value) =>
            setProgressFilter(value as SponsorshipProgress | typeof ALL)
          }
          items={{ [ALL]: "すべての進捗", ...SPONSORSHIP_PROGRESS_LABEL }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="進捗" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべての進捗</SelectItem>
            {Object.entries(SPONSORSHIP_PROGRESS_LABEL).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>フェーズ</TableHead>
              <TableHead>担当メンバー</TableHead>
              <TableHead>進捗</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : !activeYearId ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  年度が未作成です。Years から年度を作成してください。
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((yc) => (
                  <TableRow key={yc.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/yearly-companies/${yc.id}`}
                        className="hover:underline"
                      >
                        {yc.companyName}
                      </Link>
                    </TableCell>

                    <TableCell className="rounded">
                      {editingCell?.id === yc.id &&
                      editingCell.column === "companyStatus" ? (
                        <Select
                          value={yc.companyStatus}
                          defaultOpen
                          onValueChange={(value) => {
                            void setCompanyStatus(yc.id, value as CompanyStatus)
                            setEditingCell(null)
                          }}
                          onOpenChange={(open) => {
                            if (!open) setEditingCell(null)
                          }}
                        >
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(COMPANY_STATUS_LABEL).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setEditingCell({
                              id: yc.id,
                              column: "companyStatus",
                            })
                          }
                        >
                          {COMPANY_STATUS_LABEL[yc.companyStatus]}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="rounded">
                      {editingCell?.id === yc.id &&
                      editingCell.column === "phase" ? (
                        <Select
                          value={yc.phase}
                          defaultOpen
                          onValueChange={(value) => {
                            void setPhase(yc.id, value as SponsorshipPhase)
                            setEditingCell(null)
                          }}
                          onOpenChange={(open) => {
                            if (!open) setEditingCell(null)
                          }}
                        >
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SPONSORSHIP_PHASE_LABEL).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant={SPONSORSHIP_PHASE_BADGE_VARIANT[yc.phase]}
                          className="cursor-pointer"
                          onClick={() =>
                            setEditingCell({ id: yc.id, column: "phase" })
                          }
                        >
                          {SPONSORSHIP_PHASE_LABEL[yc.phase]}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="rounded">
                      {editingCell?.id === yc.id &&
                      editingCell.column === "assignedMember" ? (
                        <Select
                          value={yc.assignedMemberId ?? UNASSIGNED}
                          defaultOpen
                          onValueChange={(value) => {
                            void setAssignedMember(
                              yc.id,
                              value === UNASSIGNED ? null : value
                            )
                            setEditingCell(null)
                          }}
                          onOpenChange={(open) => {
                            if (!open) setEditingCell(null)
                          }}
                        >
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>未割当</SelectItem>
                            {users
                              .filter(
                                (u) =>
                                  u.isActive || u.id === yc.assignedMemberId
                              )
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
                          onClick={() =>
                            setEditingCell({
                              id: yc.id,
                              column: "assignedMember",
                            })
                          }
                        >
                          {yc.assignedMemberName ?? "未割当"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <EditableProgressBadge
                        value={yc.progress}
                        onChange={(value) => void setProgress(yc.id, value)}
                      />
                    </TableCell>
                  </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
