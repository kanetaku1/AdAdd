"use client"

import { useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { AssignedMemberCell } from "@/components/assigned-member-cell"
import { EditableProgressBadge } from "@/components/editable-progress-badge"
import { advisorIdForMember } from "@/lib/mock/advisor-assignments"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import {
  mockYearlyCompanies,
  updateAssignedMember,
  updateProgress,
} from "@/lib/mock/yearly-companies"
import { mockUsers } from "@/lib/mock/users"
import { getActiveYearId, mockYears } from "@/lib/mock/years"
import {
  COMPANY_STATUS_LABEL,
  SPONSORSHIP_PHASE_BADGE_VARIANT,
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

type EditableColumn = "companyStatus" | "phase"

/**
 * Yearly Company List (spec/frontend.md#Yearly Company Management).
 *
 * companyStatus/phase/progress are inline-editable (spec/frontend.md UI
 * Principle 4): click a cell to change its value via a dropdown, in place.
 * assignedMember uses the shared AssignedMemberCell instead (also
 * click-to-edit, but persists via updateAssignedMember).
 *
 * TODO: replace mockYearlyCompanies with GET /years/{yearId}/companies, and
 * wire cell edits to PATCH /yearly-companies/{id}/company-status,
 * .../phase, and .../progress, once the backend endpoints exist (spec/api.md).
 */
export default function YearlyCompaniesPage() {
  const activeYearId = getActiveYearId()
  const activeYearName = mockYears.find((y) => y.id === activeYearId)?.name
  const [rows, setRows] = useState<YearlyCompany[]>(mockYearlyCompanies)
  const [nameQuery, setNameQuery] = useState("")
  const [companyStatusFilter, setCompanyStatusFilter] = useState<
    CompanyStatus | typeof ALL
  >(ALL)
  const [phaseFilter, setPhaseFilter] = useState<SponsorshipPhase | typeof ALL>(
    ALL
  )
  const [memberFilter, setMemberFilter] = useState<string | typeof ALL>(ALL)
  const [advisorFilter, setAdvisorFilter] = useState<string | typeof ALL>(ALL)
  const [progressFilter, setProgressFilter] = useState<
    SponsorshipProgress | typeof ALL
  >(ALL)
  const [editingCell, setEditingCell] = useState<{
    id: string
    column: EditableColumn
  } | null>(null)

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (yc) =>
          yc.yearId === activeYearId &&
          (nameQuery.trim()
            ? yc.companyName
                .toLowerCase()
                .includes(nameQuery.trim().toLowerCase())
            : true) &&
          (companyStatusFilter === ALL ||
            yc.companyStatus === companyStatusFilter) &&
          (phaseFilter === ALL || yc.phase === phaseFilter) &&
          (memberFilter === ALL
            ? true
            : memberFilter === UNASSIGNED
              ? !yc.assignedMemberId
              : yc.assignedMemberId === memberFilter) &&
          (advisorFilter === ALL
            ? true
            : (() => {
                const advisorId = advisorIdForMember(
                  yc.yearId,
                  yc.assignedMemberId
                )
                return advisorFilter === UNASSIGNED
                  ? !advisorId
                  : advisorId === advisorFilter
              })()) &&
          (progressFilter === ALL || yc.progress === progressFilter)
      ),
    [
      rows,
      activeYearId,
      nameQuery,
      companyStatusFilter,
      phaseFilter,
      memberFilter,
      advisorFilter,
      progressFilter,
    ]
  )

  function setCompanyStatus(id: string, value: CompanyStatus) {
    setRows((prev) =>
      prev.map((yc) => (yc.id === id ? { ...yc, companyStatus: value } : yc))
    )
  }

  function setPhase(id: string, value: SponsorshipPhase) {
    setRows((prev) =>
      prev.map((yc) => (yc.id === id ? { ...yc, phase: value } : yc))
    )
  }

  function setAssignedMember(id: string, userId: string | null) {
    updateAssignedMember(id, userId)
    setRows((prev) =>
      prev.map((yc) =>
        yc.id === id
          ? {
              ...yc,
              assignedMemberId: userId,
              assignedMemberName:
                mockUsers.find((u) => u.id === userId)?.name ?? null,
            }
          : yc
      )
    )
  }

  function setProgress(id: string, value: SponsorshipProgress) {
    updateProgress(id, value)
    setRows((prev) =>
      prev.map((yc) => (yc.id === id ? { ...yc, progress: value } : yc))
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

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="企業名で検索"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          className="max-w-56"
        />

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
          value={memberFilter}
          onValueChange={(value) => setMemberFilter(value ?? ALL)}
          items={{
            [ALL]: "すべての担当メンバー",
            [UNASSIGNED]: "未割当",
            ...Object.fromEntries(mockUsers.map((u) => [u.id, u.name])),
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="担当メンバー" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべての担当メンバー</SelectItem>
            <SelectItem value={UNASSIGNED}>未割当</SelectItem>
            {mockUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={advisorFilter}
          onValueChange={(value) => setAdvisorFilter(value ?? ALL)}
          items={{
            [ALL]: "すべてのアドバイザー",
            [UNASSIGNED]: "未設定",
            ...Object.fromEntries(mockUsers.map((u) => [u.id, u.name])),
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="アドバイザー" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべてのアドバイザー</SelectItem>
            <SelectItem value={UNASSIGNED}>未設定</SelectItem>
            {mockUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
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
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((yc) => {
              const hasContract = mockSponsorshipContracts.some(
                (c) => c.yearlyCompanyId === yc.id
              )
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
                        setCompanyStatus(yc.id, value as CompanyStatus)
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
                        setEditingCell({ id: yc.id, column: "companyStatus" })
                      }
                    >
                      {COMPANY_STATUS_LABEL[yc.companyStatus]}
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="rounded">
                  {editingCell?.id === yc.id && editingCell.column === "phase" ? (
                    <Select
                      value={yc.phase}
                      defaultOpen
                      onValueChange={(value) => {
                        setPhase(yc.id, value as SponsorshipPhase)
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
                  <AssignedMemberCell
                    assignedMemberId={yc.assignedMemberId}
                    assignedMemberName={yc.assignedMemberName}
                    onChange={(userId) => setAssignedMember(yc.id, userId)}
                  />
                </TableCell>
                <TableCell>
                  <EditableProgressBadge
                    value={yc.progress}
                    onChange={(value) => setProgress(yc.id, value)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {!hasContract && (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/yearly-companies/${yc.id}`} />}
                    >
                      契約を作成
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
