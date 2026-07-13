"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RegisterYearlyCompanyButton } from "@/components/register-yearly-company-button"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import type { Company } from "@/types/company"
import type { Year } from "@/types/year"

/**
 * Company List table + search (spec/frontend.md#Company Management), split
 * out from the (server) Companies page so the search box can be client-side
 * — same "client wrapper around server-fetched data" pattern as
 * contract-menu-section.tsx.
 */
export function CompaniesTable({
  companies,
  activeYear,
}: {
  companies: Company[]
  activeYear: Year | undefined
}) {
  const [nameQuery, setNameQuery] = useState("")

  const visibleCompanies = companies.filter((company) =>
    nameQuery.trim()
      ? company.companyName.toLowerCase().includes(nameQuery.trim().toLowerCase())
      : true
  )

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="企業名で検索"
        value={nameQuery}
        onChange={(e) => setNameQuery(e.target.value)}
        className="max-w-56"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>企業担当者</TableHead>
              <TableHead>連絡先</TableHead>
              <TableHead>電話番号 / 住所</TableHead>
              <TableHead>協賛開始年度</TableHead>
              <TableHead>メモ</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleCompanies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">
                  {company.companyName}
                  <div className="text-xs text-muted-foreground">
                    {company.companyNameKana}
                  </div>
                </TableCell>
                <TableCell>{company.contactPersonName}</TableCell>
                <TableCell>
                  {company.contactEmailOrForm.startsWith("http") ? (
                    <a
                      href={company.contactEmailOrForm}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      問い合わせフォーム
                    </a>
                  ) : (
                    company.contactEmailOrForm
                  )}
                </TableCell>
                <TableCell>
                  <div>{company.phoneNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {company.address}
                  </div>
                </TableCell>
                <TableCell>{company.firstSponsorshipYear}</TableCell>
                <TableCell className="max-w-48">
                  <div
                    className="line-clamp-2 text-sm text-muted-foreground"
                    title={company.memo || undefined}
                  >
                    {company.memo || "-"}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {activeYear && (
                      <RegisterYearlyCompanyButton
                        companyId={company.id}
                        yearId={activeYear.id}
                        yearName={activeYear.name}
                        initiallyRegistered={mockYearlyCompanies.some(
                          (yc) =>
                            yc.companyId === company.id &&
                            yc.yearId === activeYear.id
                        )}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/companies/${company.id}`} />}
                    >
                      編集
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {visibleCompanies.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  該当する企業がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
