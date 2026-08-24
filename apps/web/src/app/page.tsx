"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useActiveYear } from "@/components/active-year-provider"
import { useCurrentUser } from "@/components/current-user-provider"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyBlock, ErrorBanner, LoadingBlock } from "@/components/query-state"
import { getMyScopeMemberIds } from "@/lib/assignment-scope"
import { listAdvisorAssignmentsByYear } from "@/lib/data/advisor-assignments"
import {
  listContractMenusAcrossYear,
  listPaymentsByYear,
  listYearlyCompaniesByYear,
} from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import { PAYMENT_STATUS_BADGE_VARIANT, PAYMENT_STATUS_LABEL } from "@/lib/payment-labels"
import {
  SPONSORSHIP_PROGRESS_BADGE_VARIANT,
  SPONSORSHIP_PROGRESS_LABEL,
} from "@/lib/yearly-company-labels"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
import type { ContractMenuAcrossYear } from "@/types/contract-menu"
import type { PaymentAcrossYear } from "@/types/payment"
import type { SponsorshipProgress, YearlyCompany } from "@/types/yearly-company"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

const PROGRESS_ORDER: SponsorshipProgress[] = [
  "NOT_CONTACTED",
  "MATERIALS_SENT",
  "CONFIRMED",
  "INVOICE_SENT",
  "PAYMENT_RECEIVED",
  "RECEIPT_SENT",
  "DECLINED",
  "PENDING",
]

/**
 * "自分の担当企業" sort order — action-needed stages (未連絡/保留) first, then
 * business pipeline order, 見送り(DECLINED) last since there's nothing left
 * to do on those.
 */
const PROGRESS_ATTENTION_ORDER: SponsorshipProgress[] = [
  "NOT_CONTACTED",
  "PENDING",
  "MATERIALS_SENT",
  "CONFIRMED",
  "INVOICE_SENT",
  "PAYMENT_RECEIVED",
  "RECEIPT_SENT",
  "DECLINED",
]

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

/**
 * Dashboard (spec/frontend.md#Dashboard). Aggregates data already shown
 * elsewhere (Yearly Companies, Contract Menus, Payments) rather than
 * introducing new persisted state — scoped to the active Year via
 * `GET /years/{yearId}/companies` (which now joins `contractTotalAmount`,
 * spec/api.md#List Yearly Companies), `GET /years/{yearId}/contract-menus`,
 * and `GET /years/{yearId}/payments`. All counts/sums below are computed
 * client-side from those lists — no dedicated aggregation endpoint (see
 * Issue #21 discussion).
 *
 * "自分の担当企業" is always scoped to the signed-in User's own assignment,
 * plus — for a Sponsorship Advisor — every Member they supervise
 * (`AdvisorAssignment`, spec/domain.md Rule 9), via `getMyScopeMemberIds`
 * (apps/web/src/lib/assignment-scope.ts, shared with
 * ad-material-progress/page.tsx's follow-up list toggle). Unlike that
 * toggle, this section has no unscoped fallback — it's the Member/Advisor's
 * own working list, not a shared aggregate (see Yearly Company List / Ad
 * Material Progress for the all-companies view).
 */
export default function DashboardPage() {
  const { activeYear, loading: yearLoading, error: yearError } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const { currentUser } = useCurrentUser()
  const currentUserId = currentUser?.id ?? null

  const [yearlyCompanies, setYearlyCompanies] = useState<YearlyCompany[]>([])
  const [contractMenus, setContractMenus] = useState<ContractMenuAcrossYear[]>(
    []
  )
  const [payments, setPayments] = useState<PaymentAcrossYear[]>([])
  const [advisorAssignments, setAdvisorAssignments] = useState<
    AdvisorAssignment[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setYearlyCompanies([])
        setContractMenus([])
        setPayments([])
        setAdvisorAssignments([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [ycList, contractMenuList, paymentList, advisorAssignmentList] =
          await Promise.all([
            listYearlyCompaniesByYear(yearId),
            listContractMenusAcrossYear(yearId),
            listPaymentsByYear(yearId),
            listAdvisorAssignmentsByYear(yearId),
          ])
        if (cancelled) return
        setYearlyCompanies(ycList)
        setContractMenus(contractMenuList)
        setPayments(paymentList)
        setAdvisorAssignments(advisorAssignmentList)
      } catch (e) {
        if (!cancelled) {
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
  }, [activeYearId])

  const totalCompanies = yearlyCompanies.length
  const totalContractAmount = yearlyCompanies.reduce(
    (sum, yc) => sum + (yc.contractTotalAmount ?? 0),
    0
  )
  const confirmedPayments = payments.filter(
    (p) => p.status === "CONFIRMED"
  ).length
  const waitingPayments = payments.filter((p) => p.status === "WAITING").length

  const progressCounts = PROGRESS_ORDER.map((progress) => ({
    progress,
    count: yearlyCompanies.filter((yc) => yc.progress === progress).length,
  })).filter(({ count }) => count > 0)
  const maxProgressCount = Math.max(1, ...progressCounts.map((p) => p.count))

  const myScopeMemberIds = getMyScopeMemberIds(advisorAssignments, currentUserId)
  const contractMenusByYearlyCompanyId = new Map<string, ContractMenuAcrossYear[]>()
  for (const cm of contractMenus) {
    const list = contractMenusByYearlyCompanyId.get(cm.yearlyCompanyId) ?? []
    list.push(cm)
    contractMenusByYearlyCompanyId.set(cm.yearlyCompanyId, list)
  }
  const paymentByYearlyCompanyId = new Map(
    payments.map((p) => [p.yearlyCompanyId, p])
  )

  const myCompanies = yearlyCompanies
    .filter(
      (yc) => yc.assignedMemberId !== null && myScopeMemberIds.has(yc.assignedMemberId)
    )
    .sort(
      (a, b) =>
        PROGRESS_ATTENTION_ORDER.indexOf(a.progress) -
        PROGRESS_ATTENTION_ORDER.indexOf(b.progress)
    )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">ダッシュボード</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}年度 協賛活動サマリ
        </p>
      </div>

      <ErrorBanner message={yearError || error} />

      {yearLoading || loading ? (
        <LoadingBlock />
      ) : !activeYearId ? (
        <EmptyBlock message="年度が未作成です。年度画面から作成してください。" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="協賛企業数" value={`${totalCompanies}社`} />
            <StatTile
              label="契約金額合計"
              value={currencyFormatter.format(totalContractAmount)}
            />
            <StatTile label="入金確認済み" value={`${confirmedPayments}件`} />
            <StatTile label="入金待ち" value={`${waitingPayments}件`} />
          </div>

          <div className="rounded-md border p-4">
            <h2 className="mb-2 font-medium">進捗の内訳</h2>
            <div className="flex flex-col gap-1">
              {progressCounts.map(({ progress, count }) => (
                <div key={progress} className="flex items-center gap-2">
                  <div className="w-24 shrink-0 text-xs text-muted-foreground">
                    {SPONSORSHIP_PROGRESS_LABEL[progress]}
                  </div>
                  <div className="h-2 flex-1 max-w-xs rounded bg-muted">
                    <div
                      className="h-2 rounded bg-primary"
                      style={{
                        width: `${(count / maxProgressCount) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="w-6 shrink-0 text-right text-xs">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border p-4">
            <div className="mb-3">
              <h2 className="font-medium">自分の担当企業</h2>
              <p className="text-sm text-muted-foreground">
                担当企業（アドバイザーは担当している実働メンバーの企業を含む）の進捗・広告・入金状況をまとめて確認できます。
              </p>
            </div>
            {myCompanies.length === 0 ? (
              <EmptyBlock message="現在、担当している企業はありません。" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>会社名</TableHead>
                    <TableHead>進捗</TableHead>
                    <TableHead>広告進捗</TableHead>
                    <TableHead>入金状況</TableHead>
                    <TableHead>担当メンバー</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myCompanies.map((yc) => {
                    const menus = contractMenusByYearlyCompanyId.get(yc.id) ?? []
                    const submittedCount = menus.filter(
                      (m) => m.status === "SUBMITTED"
                    ).length
                    const payment = paymentByYearlyCompanyId.get(yc.id)
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
                        <TableCell>
                          <Badge variant={SPONSORSHIP_PROGRESS_BADGE_VARIANT[yc.progress]}>
                            {SPONSORSHIP_PROGRESS_LABEL[yc.progress]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {menus.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              契約なし
                            </span>
                          ) : (
                            <Badge
                              variant={
                                submittedCount === menus.length
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {submittedCount}/{menus.length}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment ? (
                            <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[payment.status]}>
                              {PAYMENT_STATUS_LABEL[payment.status]}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{yc.assignedMemberName ?? "未割当"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
