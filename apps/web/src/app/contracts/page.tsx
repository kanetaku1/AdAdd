"use client"

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
import { updateYearlyCompanyProgress } from "@/lib/data/sponsorship"
import type { SponsorshipProgress } from "@/types/yearly-company"
import { useState } from "react"
import type { YearlyCompany } from "@/types/yearly-company"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

/**
 * Legacy contract list — links into Yearly Company Detail (core screen).
 * Prefer operating from /yearly-companies.
 */
export default function SponsorshipContractsPage() {
  const [yearlyCompanies, setYearlyCompanies] =
    useState<YearlyCompany[]>(mockYearlyCompanies)

  async function setProgress(
    yearlyCompanyId: string,
    progress: SponsorshipProgress
  ) {
    await updateYearlyCompanyProgress(yearlyCompanyId, progress)
    setYearlyCompanies((prev) =>
      prev.map((yc) => (yc.id === yearlyCompanyId ? { ...yc, progress } : yc))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Sponsorship Contracts</h1>
        <p className="text-muted-foreground">
          契約操作の中核は{" "}
          <Link href="/yearly-companies" className="underline">
            Yearly Companies
          </Link>{" "}
          詳細です。この一覧は参照用です。
        </p>
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
                      href={`/yearly-companies/${contract.yearlyCompanyId}`}
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
                        onChange={(value) =>
                          void setProgress(yearlyCompany.id, value)
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
