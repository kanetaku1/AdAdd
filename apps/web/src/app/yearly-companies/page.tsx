"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FileCheck, FileX, Users, Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  ColumnFilterOption,
  ColumnFilterPopover,
} from "@/components/column-filter-header"
import { useCurrentUser } from "@/components/current-user-provider"
import { EditableCompanyStatusBadge } from "@/components/editable-company-status-badge"
import { useUsers } from "@/components/users-provider"
import { useYearCatalog } from "@/components/year-catalog-provider"
import { EditableProgressBadge } from "@/components/editable-progress-badge"
import { EditableSponsorshipPhaseBadge } from "@/components/editable-sponsorship-phase-badge"
import { IconActionButton } from "@/components/icon-action-button"
import { EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import { isApiEnabled } from "@/lib/api/client"
import { canAccess } from "@/lib/auth/roles"
import { listCompanies } from "@/lib/data/companies"
import {
  assignMember,
  listYearlyCompaniesByYear,
  updateYearlyCompanyPhase,
  updateYearlyCompanyProgress,
  updateYearlyCompanyStatus,
} from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import { downloadYearlyCompanyCsv } from "@/lib/yearly-company-csv"
import {
  COMPANY_STATUS_LABEL,
  SPONSORSHIP_PHASE_LABEL,
  SPONSORSHIP_PROGRESS_LABEL,
} from "@/lib/yearly-company-labels"
import type {
  CompanyStatus,
  SponsorshipPhase,
  SponsorshipProgress,
  YearlyCompany,
} from "@/types/yearly-company"

const ALL = "ALL" as const
const UNASSIGNED = "UNASSIGNED" as const
const CONTRACT_FILTER_HAS = "契約あり" as const
const CONTRACT_FILTER_NONE = "契約なし" as const
type ContractFilter =
  | typeof CONTRACT_FILTER_HAS
  | typeof CONTRACT_FILTER_NONE
  | null

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()（）・\-ー_]/g, "")
}

function buildBigrams(text: string): Set<string> {
  const grams = new Set<string>()
  if (text.length <= 1) {
    grams.add(text)
    return grams
  }
  for (let i = 0; i < text.length - 1; i += 1) {
    grams.add(text.slice(i, i + 2))
  }
  return grams
}

function fuzzyMatchCompanyName(companyName: string, query: string): boolean {
  const normalizedName = normalizeSearchText(companyName)
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true
  if (normalizedName.includes(normalizedQuery)) return true

  const nameGrams = buildBigrams(normalizedName)
  const queryGrams = buildBigrams(normalizedQuery)
  let intersection = 0
  for (const gram of queryGrams) {
    if (nameGrams.has(gram)) intersection += 1
  }
  const score = intersection / Math.max(queryGrams.size, 1)
  return score >= 0.6
}

type EditableColumn = "assignedMember"
type ColumnFilterKey = "status" | "phase" | "member" | "progress"

/**
 * Yearly Company List (spec/frontend.md#Yearly Company Management).
 * CSV export writes the current `visibleRows` joined with Company master
 * details (spec/frontend.md#CSV Import / Export, Issue #133).
 */
export default function YearlyCompaniesPage() {
  const {
    activeYear,
    loading: yearLoading,
    error: yearError,
  } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const { currentUser } = useCurrentUser()
  const canEditStatusPhaseProgress = canAccess(currentUser?.roles, [
    "SPONSORSHIP_MEMBER",
    "ADMINISTRATOR",
  ])
  const canEditAssignee = canAccess(currentUser?.roles, ["ADMINISTRATOR"])
  const { users, ensureUsers } = useUsers()
  const {
    advisorAssignments: advisorAssignmentsForYear,
    isAdvisorAssignmentsLoading,
    advisorAssignmentsError,
    ensureAdvisorAssignments,
  } = useYearCatalog()
  const [rows, setRows] = useState<YearlyCompany[]>([])
  const [companyKeyword, setCompanyKeyword] = useState("")
  const [memberFilter, setMemberFilter] = useState<string | typeof ALL>(ALL)
  const [advisorFilter, setAdvisorFilter] = useState<string | typeof ALL>(ALL)
  const [contractFilter, setContractFilter] = useState<ContractFilter>(null)
  const [companyStatusFilter, setCompanyStatusFilter] = useState<
    CompanyStatus | typeof ALL
  >(ALL)
  const [phaseFilter, setPhaseFilter] = useState<SponsorshipPhase | typeof ALL>(
    ALL
  )
  const [progressFilter, setProgressFilter] = useState<
    SponsorshipProgress | typeof ALL
  >(ALL)
  const [openColumnFilter, setOpenColumnFilter] =
    useState<ColumnFilterKey | null>(null)
  const [advisorFilterOpen, setAdvisorFilterOpen] = useState(false)
  const [editingCell, setEditingCell] = useState<{
    id: string
    column: EditableColumn
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const advisorAssignments = activeYearId
    ? advisorAssignmentsForYear(activeYearId)
    : []
  const catalogLoading = Boolean(
    activeYearId && isAdvisorAssignmentsLoading(activeYearId)
  )

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setRows([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [list] = await Promise.all([
          listYearlyCompaniesByYear(yearId),
          ensureUsers(),
          ensureAdvisorAssignments(yearId),
        ])
        if (cancelled) return
        setRows(list)
      } catch (e) {
        if (!cancelled) {
          setRows([])
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
  }, [activeYearId, ensureUsers, ensureAdvisorAssignments])

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (yc) =>
          yc.yearId === activeYearId &&
          fuzzyMatchCompanyName(yc.companyName, companyKeyword) &&
          (companyStatusFilter === ALL ||
            yc.companyStatus === companyStatusFilter) &&
          (phaseFilter === ALL || yc.phase === phaseFilter) &&
          (progressFilter === ALL || yc.progress === progressFilter) &&
          (memberFilter === ALL
            ? true
            : memberFilter === UNASSIGNED
              ? yc.assignedMemberId === null
              : yc.assignedMemberId === memberFilter) &&
          (advisorFilter === ALL
            ? true
            : yc.assignedMemberId
              ? advisorAssignments.some(
                  (assignment) =>
                    assignment.memberId === yc.assignedMemberId &&
                    assignment.advisorId === advisorFilter
                )
              : false) &&
          (contractFilter === null
            ? true
            : contractFilter === CONTRACT_FILTER_HAS
              ? yc.contractTotalAmount !== null
              : yc.contractTotalAmount === null)
      ),
    [
      rows,
      activeYearId,
      companyKeyword,
      companyStatusFilter,
      phaseFilter,
      progressFilter,
      memberFilter,
      advisorFilter,
      advisorAssignments,
      contractFilter,
    ]
  )

  const memberOptions = useMemo(
    () => users.filter((u) => u.isActive),
    [users]
  )

  const advisorOptions = useMemo(() => {
    const advisorIds = new Set(advisorAssignments.map((a) => a.advisorId))
    return users.filter((u) => advisorIds.has(u.id))
  }, [advisorAssignments, users])

  const companySuggestions = useMemo(() => {
    const base = rows.filter((yc) => yc.yearId === activeYearId)
    const names = Array.from(new Set(base.map((yc) => yc.companyName)))
    if (!companyKeyword.trim()) return []
    return names
      .filter((name) => fuzzyMatchCompanyName(name, companyKeyword))
      .slice(0, 8)
  }, [rows, activeYearId, companyKeyword])

  const memberFacetCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const yc of rows) {
      if (yc.yearId !== activeYearId) continue
      const key = yc.assignedMemberId ?? UNASSIGNED
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [rows, activeYearId])

  const advisorFacetCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const yc of rows) {
      if (yc.yearId !== activeYearId || !yc.assignedMemberId) continue
      const advisors = advisorAssignments.filter(
        (assignment) => assignment.memberId === yc.assignedMemberId
      )
      for (const advisor of advisors) {
        counts.set(advisor.advisorId, (counts.get(advisor.advisorId) ?? 0) + 1)
      }
    }
    return counts
  }, [rows, activeYearId, advisorAssignments])

  const hasActiveFilters =
    companyKeyword.trim().length > 0 ||
    memberFilter !== ALL ||
    advisorFilter !== ALL ||
    contractFilter !== null ||
    companyStatusFilter !== ALL ||
    phaseFilter !== ALL ||
    progressFilter !== ALL

  function toggleColumnFilter(key: ColumnFilterKey) {
    setOpenColumnFilter((current) => (current === key ? null : key))
  }

  async function setCompanyStatus(id: string, value: CompanyStatus) {
    setActionError(null)
    setSavingId(id)
    try {
      await updateYearlyCompanyStatus(id, value)
      setRows((prev) =>
        prev.map((yc) => (yc.id === id ? { ...yc, companyStatus: value } : yc))
      )
    } catch (e) {
      setActionError(
        getErrorMessage(e, { fallback: "ステータスの更新に失敗しました" })
      )
    } finally {
      setSavingId(null)
    }
  }

  async function setPhase(id: string, value: SponsorshipPhase) {
    setActionError(null)
    setSavingId(id)
    try {
      await updateYearlyCompanyPhase(id, value)
      setRows((prev) =>
        prev.map((yc) => (yc.id === id ? { ...yc, phase: value } : yc))
      )
    } catch (e) {
      setActionError(
        getErrorMessage(e, { fallback: "フェーズの更新に失敗しました" })
      )
    } finally {
      setSavingId(null)
    }
  }

  async function setProgress(id: string, value: SponsorshipProgress) {
    setActionError(null)
    setSavingId(id)
    try {
      await updateYearlyCompanyProgress(id, value)
      setRows((prev) =>
        prev.map((yc) => (yc.id === id ? { ...yc, progress: value } : yc))
      )
    } catch (e) {
      setActionError(getErrorMessage(e, { fallback: "進捗の更新に失敗しました" }))
    } finally {
      setSavingId(null)
    }
  }

  async function setAssignedMember(id: string, userId: string | null) {
    setActionError(null)
    setSavingId(id)
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
        getErrorMessage(e, { fallback: "担当メンバーの更新に失敗しました" })
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleExportCsv() {
    if (exporting || loading || yearLoading || !activeYear) return
    setActionError(null)
    setExporting(true)
    try {
      const companies = await listCompanies()
      downloadYearlyCompanyCsv(activeYear.name, visibleRows, companies)
    } catch (e) {
      setActionError(
        getErrorMessage(e, { fallback: "CSVの出力に失敗しました" })
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">協賛企業(年度別)</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}年度 協賛企業の管理
        </p>
      </div>

      {!isApiEnabled() && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          開発モード: モックデータを使用しています（`NEXT_PUBLIC_API_BASE_URL` で API 接続）。
        </p>
      )}

      <ErrorBanner
        message={
          yearError ||
          error ||
          (activeYearId ? advisorAssignmentsError(activeYearId) : null)
        }
      />
      <ErrorBanner message={actionError} />

      <div className="flex flex-col gap-3 rounded-md border bg-background p-3">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-56 flex-1">
            <Input
              value={companyKeyword}
              onChange={(e) => setCompanyKeyword(e.target.value)}
              placeholder="企業名で検索"
            />
            {companyKeyword.trim().length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {companySuggestions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    候補が見つかりません
                  </span>
                ) : (
                  companySuggestions.map((name) => (
                    <Button
                      key={name}
                      size="xs"
                      variant="outline"
                      onClick={() => setCompanyKeyword(name)}
                    >
                      {name}
                    </Button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex rounded-md border p-0.5">
            <Button
              type="button"
              size="sm"
              variant={
                contractFilter === CONTRACT_FILTER_HAS ? "secondary" : "ghost"
              }
              className="h-7 gap-1.5 rounded-sm px-2.5"
              onClick={() =>
                setContractFilter((current) =>
                  current === CONTRACT_FILTER_HAS ? null : CONTRACT_FILTER_HAS
                )
              }
            >
              <FileCheck className="size-3.5" />
              契約あり
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                contractFilter === CONTRACT_FILTER_NONE ? "secondary" : "ghost"
              }
              className="h-7 gap-1.5 rounded-sm px-2.5"
              onClick={() =>
                setContractFilter((current) =>
                  current === CONTRACT_FILTER_NONE ? null : CONTRACT_FILTER_NONE
                )
              }
            >
              <FileX className="size-3.5" />
              契約なし
            </Button>
          </div>

          <ColumnFilterPopover
            icon={<Users className="size-4" />}
            label={
              advisorFilter === ALL
                ? undefined
                : (users.find((u) => u.id === advisorFilter)?.name ?? "選択中")
            }
            active={advisorFilter !== ALL}
            open={advisorFilterOpen}
            onToggle={() => setAdvisorFilterOpen((prev) => !prev)}
            onClose={() => setAdvisorFilterOpen(false)}
          >
            {advisorOptions.map((u) => (
              <ColumnFilterOption
                key={u.id}
                selected={advisorFilter === u.id}
                onSelect={() =>
                  setAdvisorFilter((current) => (current === u.id ? ALL : u.id))
                }
              >
                {u.name} ({advisorFacetCounts.get(u.id) ?? 0})
              </ColumnFilterOption>
            ))}
          </ColumnFilterPopover>

          <IconActionButton
            label={exporting ? "出力中…" : "CSVを出力"}
            variant="outline"
            disabled={exporting || loading || yearLoading || !activeYear}
            onClick={() => void handleExportCsv()}
          >
            <Download />
          </IconActionButton>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>適用中:</span>
            {companyKeyword && (
              <Badge variant="secondary">会社名: {companyKeyword}</Badge>
            )}
            {memberFilter !== ALL && (
              <Badge variant="secondary">
                担当者:{" "}
                {memberFilter === UNASSIGNED
                  ? "未割当"
                  : (users.find((u) => u.id === memberFilter)?.name ?? "不明")}
              </Badge>
            )}
            {advisorFilter !== ALL && (
              <Badge variant="secondary">
                アドバイザー:{" "}
                {users.find((u) => u.id === advisorFilter)?.name ?? "不明"}
              </Badge>
            )}
            {contractFilter !== null && (
              <Badge variant="secondary">{contractFilter}</Badge>
            )}
            {companyStatusFilter !== ALL && (
              <Badge variant="secondary">
                ステータス: {COMPANY_STATUS_LABEL[companyStatusFilter]}
              </Badge>
            )}
            {phaseFilter !== ALL && (
              <Badge variant="secondary">
                フェーズ: {SPONSORSHIP_PHASE_LABEL[phaseFilter]}
              </Badge>
            )}
            {progressFilter !== ALL && (
              <Badge variant="secondary">
                進捗: {SPONSORSHIP_PROGRESS_LABEL[progressFilter]}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="rounded-md border [&_[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>
                <ColumnFilterPopover
                  label="ステータス"
                  active={companyStatusFilter !== ALL}
                  open={openColumnFilter === "status"}
                  onToggle={() => toggleColumnFilter("status")}
                  onClose={() => setOpenColumnFilter(null)}
                >
                  <ColumnFilterOption
                    selected={companyStatusFilter === ALL}
                    onSelect={() => setCompanyStatusFilter(ALL)}
                  >
                    すべて
                  </ColumnFilterOption>
                  {Object.entries(COMPANY_STATUS_LABEL).map(([value, label]) => (
                    <ColumnFilterOption
                      key={value}
                      selected={companyStatusFilter === value}
                      onSelect={() =>
                        setCompanyStatusFilter(value as CompanyStatus)
                      }
                    >
                      {label}
                    </ColumnFilterOption>
                  ))}
                </ColumnFilterPopover>
              </TableHead>
              <TableHead>
                <ColumnFilterPopover
                  label="フェーズ"
                  active={phaseFilter !== ALL}
                  open={openColumnFilter === "phase"}
                  onToggle={() => toggleColumnFilter("phase")}
                  onClose={() => setOpenColumnFilter(null)}
                >
                  <ColumnFilterOption
                    selected={phaseFilter === ALL}
                    onSelect={() => setPhaseFilter(ALL)}
                  >
                    すべて
                  </ColumnFilterOption>
                  {Object.entries(SPONSORSHIP_PHASE_LABEL).map(
                    ([value, label]) => (
                      <ColumnFilterOption
                        key={value}
                        selected={phaseFilter === value}
                        onSelect={() => setPhaseFilter(value as SponsorshipPhase)}
                      >
                        {label}
                      </ColumnFilterOption>
                    )
                  )}
                </ColumnFilterPopover>
              </TableHead>
              <TableHead>
                <ColumnFilterPopover
                  label="担当者"
                  active={memberFilter !== ALL}
                  open={openColumnFilter === "member"}
                  onToggle={() => toggleColumnFilter("member")}
                  onClose={() => setOpenColumnFilter(null)}
                >
                  <ColumnFilterOption
                    selected={memberFilter === ALL}
                    onSelect={() => setMemberFilter(ALL)}
                  >
                    すべて
                  </ColumnFilterOption>
                  <ColumnFilterOption
                    selected={memberFilter === UNASSIGNED}
                    onSelect={() => setMemberFilter(UNASSIGNED)}
                  >
                    未割当 ({memberFacetCounts.get(UNASSIGNED) ?? 0})
                  </ColumnFilterOption>
                  {memberOptions.map((u) => (
                    <ColumnFilterOption
                      key={u.id}
                      selected={memberFilter === u.id}
                      onSelect={() => setMemberFilter(u.id)}
                    >
                      {u.name} ({memberFacetCounts.get(u.id) ?? 0})
                    </ColumnFilterOption>
                  ))}
                </ColumnFilterPopover>
              </TableHead>
              <TableHead>
                <ColumnFilterPopover
                  label="進捗"
                  active={progressFilter !== ALL}
                  open={openColumnFilter === "progress"}
                  onToggle={() => toggleColumnFilter("progress")}
                  onClose={() => setOpenColumnFilter(null)}
                >
                  <ColumnFilterOption
                    selected={progressFilter === ALL}
                    onSelect={() => setProgressFilter(ALL)}
                  >
                    すべて
                  </ColumnFilterOption>
                  {Object.entries(SPONSORSHIP_PROGRESS_LABEL).map(
                    ([value, label]) => (
                      <ColumnFilterOption
                        key={value}
                        selected={progressFilter === value}
                        onSelect={() =>
                          setProgressFilter(value as SponsorshipProgress)
                        }
                      >
                        {label}
                      </ColumnFilterOption>
                    )
                  )}
                </ColumnFilterPopover>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading || catalogLoading ? (
              <LoadingRow colSpan={5} />
            ) : !activeYearId ? (
              <EmptyRow
                colSpan={5}
                message="年度が未作成です。年度画面から作成してください。"
              />
            ) : visibleRows.length === 0 ? (
              <EmptyRow colSpan={5} message="該当する企業がありません。" />
            ) : (
              visibleRows.map((yc) => {
                const rowSaving = savingId === yc.id
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
                      <EditableCompanyStatusBadge
                        value={yc.companyStatus}
                        onChange={(value) =>
                          void setCompanyStatus(yc.id, value)
                        }
                        disabled={rowSaving || !canEditStatusPhaseProgress}
                      />
                    </TableCell>

                    <TableCell className="rounded">
                      <EditableSponsorshipPhaseBadge
                        value={yc.phase}
                        onChange={(value) => void setPhase(yc.id, value)}
                        disabled={rowSaving || !canEditStatusPhaseProgress}
                      />
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
                          className={
                            rowSaving || !canEditAssignee
                              ? "opacity-50"
                              : "cursor-pointer"
                          }
                          onClick={() => {
                            if (rowSaving || !canEditAssignee) return
                            setEditingCell({
                              id: yc.id,
                              column: "assignedMember",
                            })
                          }}
                        >
                          {yc.assignedMemberName ?? "未割当"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <EditableProgressBadge
                        value={yc.progress}
                        onChange={(value) => void setProgress(yc.id, value)}
                        disabled={rowSaving || !canEditStatusPhaseProgress}
                      />
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
