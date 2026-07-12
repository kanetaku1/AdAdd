"use client"

import { useState } from "react"
import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditableProgressBadge } from "@/components/editable-progress-badge"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import type { SponsorshipProgress, YearlyCompany } from "@/types/yearly-company"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

/**
 * Sponsorship Contract list (spec/frontend.md#Contract Management).
 * A Yearly Company has at most one contract (spec/domain.md), created only
 * once an agreement is reached — so this is one row per confirmed contract,
 * not per Yearly Company.
 *
 * Progress is editable here (not on Yearly Companies) because Sponsorship
 * Members update it as they work a company's contract (UC-05/UC-06/UC-10);
 * Yearly Companies is the Company Management Department's classification
 * screen (companyStatus/phase) and shows progress read-only for context.
 *
 * TODO: replace mockSponsorshipContracts with a real fetch (spec/api.md has
 * GET /yearly-companies/{id}/contract but no list-all-contracts-for-a-year
 * endpoint yet), and wire progress edits to the YearlyCompany progress
 * endpoint once the backend exists.
 */
export default function SponsorshipContractsPage() {
  const [yearlyCompanies, setYearlyCompanies] =
    useState<YearlyCompany[]>(mockYearlyCompanies)

  function setProgress(yearlyCompanyId: string, progress: SponsorshipProgress) {
    setYearlyCompanies((prev) =>
      prev.map((yc) => (yc.id === yearlyCompanyId ? { ...yc, progress } : yc))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Sponsorship Contracts</h1>
        <p className="text-muted-foreground">2026年度 協賛契約の管理</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>契約日</TableHead>
              <TableHead>進捗</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead className="text-right">合計金額</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockSponsorshipContracts.map((contract) => {
              const yearlyCompany = yearlyCompanies.find(
                (yc) => yc.id === contract.yearlyCompanyId
              )
              return (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="hover:underline"
                    >
                      {yearlyCompany?.companyName ?? "(不明な企業)"}
                    </Link>
                  </TableCell>
                  <TableCell>{contract.contractDate}</TableCell>
                  <TableCell>
                    {yearlyCompany && (
                      <EditableProgressBadge
                        value={yearlyCompany.progress}
                        onChange={(progress) =>
                          setProgress(yearlyCompany.id, progress)
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>{contract.assigneeName ?? "未割当"}</TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(contract.totalAmount)}
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
