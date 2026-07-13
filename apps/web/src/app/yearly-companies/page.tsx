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
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import {
  mockYearlyCompanies,
  updateAssignedMember,
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
  YearlyCompany,
} from "@/types/yearly-company"

const ALL = "ALL" as const
const UNASSIGNED = "UNASSIGNED" as const

type EditableColumn = "companyStatus" | "phase" | "assignedMember"

/**
 * Yearly Company List (spec/frontend.md#Yearly Company Management).
 *
 * companyStatus/phase are inline-editable (spec/frontend.md UI Principle 4):
 * click a cell to change its value via a dropdown, in place.
 *
 * TODO: replace mockYearlyCompanies with GET /years/{yearId}/companies, and
 * wire cell edits to PATCH /yearly-companies/{id}/company-status and
 * .../phase, once the backend endpoints exist (spec/api.md).
 */
export default function YearlyCompaniesPage() {
  const activeYearId = getActiveYearId()
  const activeYearName = mockYears.find((y) => y.id === activeYearId)?.name
  const [rows, setRows] = useState<YearlyCompany[]>(mockYearlyCompanies)
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Yearly Companies</h1>
        <p className="text-muted-foreground">
          {activeYearName ?? ""}年度 協賛企業の管理
        </p>
      </div>

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
                  {editingCell?.id === yc.id &&
                  editingCell.column === "assignedMember" ? (
                    <Select
                      value={yc.assignedMemberId ?? UNASSIGNED}
                      defaultOpen
                      onValueChange={(value) => {
                        setAssignedMember(
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
                        {mockUsers
                          .filter(
                            (u) => u.isActive || u.id === yc.assignedMemberId
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
                        setEditingCell({ id: yc.id, column: "assignedMember" })
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
                  {!hasContract && (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/contracts/new?yearlyCompanyId=${yc.id}`} />}
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
