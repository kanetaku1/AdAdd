"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Download, Pencil } from "lucide-react"

import { IconActionButton } from "@/components/icon-action-button"
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
import { useActiveYear } from "@/components/active-year-provider"
import { ErrorBanner, EmptyRow } from "@/components/query-state"
import { downloadCompanyCsv } from "@/lib/company-csv"
import { listYearlyCompaniesByYear } from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import type { Company } from "@/types/company"

/**
 * Company List table + search (spec/frontend.md#Company Management), split
 * out from the (server) Companies page so the search box can be client-side
 * — same "client wrapper around server-fetched data" pattern as
 * contract-menu-section.tsx. Reads the active Year from the shared
 * ActiveYearProvider (Issue #18) rather than a prop. CSV export writes
 * `visibleCompanies` (spec/frontend.md#CSV Import / Export, Issue #134).
 */
export function CompaniesTable({ companies }: { companies: Company[] }) {
  const { activeYear } = useActiveYear()
  const [nameQuery, setNameQuery] = useState("")
  const [registeredCompanyIds, setRegisteredCompanyIds] = useState<
    Set<string>
  >(new Set())
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!activeYear) {
        setRegisteredCompanyIds(new Set())
        setError(null)
        return
      }
      try {
        const list = await listYearlyCompaniesByYear(activeYear.id)
        if (!cancelled) {
          setRegisteredCompanyIds(new Set(list.map((yc) => yc.companyId)))
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setRegisteredCompanyIds(new Set())
          setError(
            getErrorMessage(e, { fallback: "年度登録状況の取得に失敗しました" })
          )
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [activeYear])

  const visibleCompanies = companies.filter((company) =>
    nameQuery.trim()
      ? company.companyName.toLowerCase().includes(nameQuery.trim().toLowerCase())
      : true
  )

  function handleExportCsv() {
    if (exporting) return
    setError(null)
    setExporting(true)
    try {
      downloadCompanyCsv(visibleCompanies)
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "CSVの出力に失敗しました" }))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="企業名で検索"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          className="max-w-56"
        />
        <IconActionButton
          label={exporting ? "出力中…" : "CSVを出力"}
          variant="outline"
          disabled={exporting}
          onClick={handleExportCsv}
        >
          <Download />
        </IconActionButton>
      </div>

      <ErrorBanner message={error} />

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
                    {activeYear && !registeredCompanyIds.has(company.id) && (
                      <RegisterYearlyCompanyButton
                        companyId={company.id}
                        yearId={activeYear.id}
                        yearName={activeYear.name}
                        initiallyRegistered={false}
                      />
                    )}
                    <IconActionButton
                      label="編集"
                      render={<Link href={`/companies/${company.id}`} />}
                    >
                      <Pencil />
                    </IconActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {visibleCompanies.length === 0 && (
              <EmptyRow colSpan={7} message="該当する企業がありません" />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
