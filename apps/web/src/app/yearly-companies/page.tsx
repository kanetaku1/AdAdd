"use client"

import { useMemo, useState } from "react"
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
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import {
  COMPANY_STATUS_LABEL,
  SPONSORSHIP_PHASE_BADGE_VARIANT,
  SPONSORSHIP_PHASE_LABEL,
  SPONSORSHIP_PROGRESS_LABEL,
} from "@/lib/yearly-company-labels"
import type { CompanyStatus, SponsorshipPhase } from "@/types/yearly-company"

const ALL = "ALL" as const

/**
 * Yearly Company List (spec/frontend.md#Yearly Company Management).
 * Manages companies participating in the current festival year — the central
 * business screen of AdAdd (spec/domain.md: Yearly Company is the domain's core aggregate).
 * TODO: replace mockYearlyCompanies with GET /years/{yearId}/companies once the
 * backend YearlyCompany endpoints exist (spec/api.md).
 */
export default function YearlyCompaniesPage() {
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus | typeof ALL>(ALL)
  const [phase, setPhase] = useState<SponsorshipPhase | typeof ALL>(ALL)

  const yearlyCompanies = useMemo(
    () =>
      mockYearlyCompanies.filter(
        (yc) =>
          (companyStatus === ALL || yc.companyStatus === companyStatus) &&
          (phase === ALL || yc.phase === phase)
      ),
    [companyStatus, phase]
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Yearly Companies</h1>
        <p className="text-muted-foreground">2026年度 協賛企業の管理</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={companyStatus}
          onValueChange={(value) => setCompanyStatus(value as CompanyStatus | typeof ALL)}
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
          value={phase}
          onValueChange={(value) => setPhase(value as SponsorshipPhase | typeof ALL)}
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
            {yearlyCompanies.map((yc) => (
              <TableRow key={yc.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/yearly-companies/${yc.id}`}
                    className="hover:underline"
                  >
                    {yc.companyName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {COMPANY_STATUS_LABEL[yc.companyStatus]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={SPONSORSHIP_PHASE_BADGE_VARIANT[yc.phase]}>
                    {SPONSORSHIP_PHASE_LABEL[yc.phase]}
                  </Badge>
                </TableCell>
                <TableCell>{yc.assignedMemberName ?? "未割当"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {SPONSORSHIP_PROGRESS_LABEL[yc.progress]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
