"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Download, Pencil, Trash2 } from "lucide-react"

import { useCurrentUser } from "@/components/current-user-provider"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
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
import { canAccess } from "@/lib/auth/roles"
import { downloadCompanyCsv } from "@/lib/company-csv"
import { deleteCompany } from "@/lib/data/companies"
import { listYearlyCompaniesByYear } from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import type { Company } from "@/types/company"

/** Deletion is Administrator-only system-wide (spec/api.md#Authorization Matrix). */
const DELETE_ROLES = ["ADMINISTRATOR"]

/**
 * Company List table + search (spec/frontend.md#Company Management), split
 * out from the (server) Companies page so the search box can be client-side
 * — same "client wrapper around server-fetched data" pattern as
 * contract-menu-section.tsx. Reads the active Year from the shared
 * ActiveYearProvider (Issue #18) rather than a prop. CSV export writes
 * `visibleCompanies` (spec/frontend.md#CSV Import / Export, Issue #134).
 * The per-row delete action is shown only to Administrator and confirmed
 * first (spec/frontend.md#Company List); the parent drops the row on success.
 */
export function CompaniesTable({
  companies,
  onDeleted,
}: {
  companies: Company[]
  onDeleted: (id: string) => void
}) {
  const { activeYear } = useActiveYear()
  const { currentUser } = useCurrentUser()
  const canDelete = canAccess(currentUser?.roles, DELETE_ROLES)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
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

  async function handleDelete(target: Company) {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteCompany(target.id)
      onDeleted(target.id)
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(
        getErrorMessage(e, {
          fallback: "企業の削除に失敗しました",
          overrides: {
            CONFLICT:
              "年度に登録済みの企業は、協賛の履歴を残すため削除できません。",
            FORBIDDEN: "削除は管理者のみが実行できます。",
          },
        })
      )
    } finally {
      setDeleting(false)
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
                    {canDelete && (
                      <IconActionButton
                        label={`${company.companyName}を削除`}
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTarget(company)
                        }}
                      >
                        <Trash2 className="text-destructive" />
                      </IconActionButton>
                    )}
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

      {deleteTarget && (
        <DeleteConfirmDialog
          title="企業を削除しますか？"
          description={`${deleteTarget.companyName} を企業マスタから削除します。この操作は取り消せません。`}
          error={deleteError}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete(deleteTarget)}
        />
      )}
    </div>
  )
}
