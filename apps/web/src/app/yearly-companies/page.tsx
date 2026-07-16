"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { isApiEnabled } from "@/lib/api/client"
import {
  assignMember,
  getContractByYearlyCompany,
  listUsers,
  listYearlyCompaniesByYear,
  updateYearlyCompanyPhase,
  updateYearlyCompanyStatus,
} from "@/lib/data/sponsorship"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import { getActiveYearId, mockYears } from "@/lib/mock/years"
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
  YearlyCompany,
} from "@/types/yearly-company"

const ALL = "ALL" as const
const UNASSIGNED = "UNASSIGNED" as const

type EditableColumn = "companyStatus" | "phase" | "assignedMember"

/**
 * Yearly Company List (spec/frontend.md#Yearly Company Management).
 */
export default function YearlyCompaniesPage() {
  const activeYearId = getActiveYearId() ?? "year_2026"
  const activeYearName = mockYears.find((y) => y.id === activeYearId)?.name
  const [rows, setRows] = useState<YearlyCompany[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [contractYearlyIds, setContractYearlyIds] = useState<Set<string>>(
    new Set()
  )
  const [companyStatusFilter, setCompanyStatusFilter] = useState<
    CompanyStatus | typeof ALL
  >(ALL)
  const [phaseFilter, setPhaseFilter] = useState<SponsorshipPhase | typeof ALL>(
    ALL
  )
  const [editingCell, setEditingCell] = useState<{
    id: string
    column: EditableColumn
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [list, userList] = await Promise.all([
        listYearlyCompaniesByYear(activeYearId),
        listUsers(),
      ])
      if (cancelled) return
      setRows(list)
      setUsers(userList)

      if (isApiEnabled()) {
        const flags = await Promise.all(
          list.map(async (yc) => {
            const contract = await getContractByYearlyCompany(yc.id)
            return contract ? yc.id : null
          })
        )
        if (!cancelled) {
          setContractYearlyIds(
            new Set(flags.filter((id): id is string => id !== null))
          )
        }
      } else {
        setContractYearlyIds(
          new Set(
            mockSponsorshipContracts
              .filter((c) => list.some((yc) => yc.id === c.yearlyCompanyId))
              .map((c) => c.yearlyCompanyId)
          )
        )
      }
      setLoading(false)
    }
    void load()
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
          (phaseFilter === ALL || yc.phase === phaseFilter)
      ),
    [rows, activeYearId, companyStatusFilter, phaseFilter]
  )

  async function setCompanyStatus(id: string, value: CompanyStatus) {
    await updateYearlyCompanyStatus(id, value)
    setRows((prev) =>
      prev.map((yc) => (yc.id === id ? { ...yc, companyStatus: value } : yc))
    )
  }

  async function setPhase(id: string, value: SponsorshipPhase) {
    await updateYearlyCompanyPhase(id, value)
    setRows((prev) =>
      prev.map((yc) => (yc.id === id ? { ...yc, phase: value } : yc))
    )
  }

  async function setAssignedMember(id: string, userId: string | null) {
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
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Yearly Companies</h1>
        <p className="text-muted-foreground">
          {activeYearName ?? ""}年度 協賛企業の管理
        </p>
      </div>

      {!isApiEnabled() && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          開発モード: mock データを使用（`NEXT_PUBLIC_API_BASE_URL` で API 接続）。
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={companyStatusFilter}
          onValueChange={(value) =>
            setCompanyStatusFilter(value as CompanyStatus | typeof ALL)
          }
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

        <p className="text-xs text-muted-foreground">
          ステータス・フェーズはクリックで編集できます
        </p>
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
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((yc) => {
                const hasContract = contractYearlyIds.has(yc.id)
                return (
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
                      <Badge variant="secondary">
                        {SPONSORSHIP_PROGRESS_LABEL[yc.progress]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/yearly-companies/${yc.id}`} />}
                      >
                        {hasContract ? "詳細" : "契約を作成"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
