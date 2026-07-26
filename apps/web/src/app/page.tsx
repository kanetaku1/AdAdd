"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useActiveYear } from "@/components/active-year-provider"
import { useCurrentUser } from "@/components/current-user-provider"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyBlock, ErrorBanner, LoadingBlock } from "@/components/query-state"
import { listAdvisorAssignmentsByYear } from "@/lib/data/advisor-assignments"
import { listPaymentsByYear, listYearlyCompaniesByYear } from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import { SPONSORSHIP_PROGRESS_LABEL } from "@/lib/yearly-company-labels"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
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

/** Progress stages a company management department would want to follow up on. */
const ATTENTION_PROGRESS: SponsorshipProgress[] = ["NOT_CONTACTED", "PENDING"]

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
 * elsewhere (Yearly Companies, Payments) rather than introducing new
 * persisted state — scoped to the active Year via `GET /years/{yearId}/companies`
 * (which now joins `contractTotalAmount`, spec/api.md#List Yearly Companies)
 * and `GET /years/{yearId}/payments` (spec/api.md#List Payments Across a
 * Year). All counts/sums below are computed client-side from those two
 * lists — no dedicated aggregation endpoint (see Issue #21 discussion).
 *
 * "要対応の企業" supports the same 自分の担当のみ/全件 scoping as
 * ad-material-progress/page.tsx (own assignment, plus — for a Sponsorship
 * Advisor — every Member they supervise via `AdvisorAssignment`).
 */
export default function DashboardPage() {
  const { activeYear, loading: yearLoading, error: yearError } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const { currentUser } = useCurrentUser()
  const currentUserId = currentUser?.id ?? null

  const [yearlyCompanies, setYearlyCompanies] = useState<YearlyCompany[]>([])
  const [payments, setPayments] = useState<PaymentAcrossYear[]>([])
  const [advisorAssignments, setAdvisorAssignments] = useState<
    AdvisorAssignment[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scopeOverride, setScopeOverride] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setYearlyCompanies([])
        setPayments([])
        setAdvisorAssignments([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [ycList, paymentList, advisorAssignmentList] = await Promise.all([
          listYearlyCompaniesByYear(yearId),
          listPaymentsByYear(yearId),
          listAdvisorAssignmentsByYear(yearId),
        ])
        if (cancelled) return
        setYearlyCompanies(ycList)
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

  const supervisedMemberIds = new Set(
    advisorAssignments
      .filter((a) => a.advisorId === currentUserId)
      .map((a) => a.memberId)
  )
  const myScopeMemberIds = new Set(
    [currentUserId, ...supervisedMemberIds].filter((id): id is string => id !== null)
  )

  const allAttentionCompanies = yearlyCompanies.filter((yc) =>
    ATTENTION_PROGRESS.includes(yc.progress)
  )
  const hasOwnStake = allAttentionCompanies.some(
    (yc) => yc.assignedMemberId !== null && myScopeMemberIds.has(yc.assignedMemberId)
  )
  const scopeToMine = scopeOverride ?? hasOwnStake
  const attentionCompanies = scopeToMine
    ? allAttentionCompanies.filter(
        (yc) => yc.assignedMemberId !== null && myScopeMemberIds.has(yc.assignedMemberId)
      )
    : allAttentionCompanies

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}年度 協賛活動サマリ
        </p>
      </div>

      <ErrorBanner message={yearError || error} />

      {yearLoading || loading ? (
        <LoadingBlock />
      ) : !activeYearId ? (
        <EmptyBlock message="年度が未作成です。Years から年度を作成してください。" />
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">要対応の企業</h2>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                自分の担当のみ
                <Switch
                  checked={scopeToMine}
                  onCheckedChange={(checked) => setScopeOverride(checked)}
                />
              </label>
            </div>
            {attentionCompanies.length === 0 ? (
              <EmptyBlock
                message={
                  scopeToMine
                    ? "自分の担当分に、現在要対応の企業はありません。"
                    : "現在、要対応の企業はありません。"
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>会社名</TableHead>
                    <TableHead>進捗</TableHead>
                    <TableHead>担当メンバー</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attentionCompanies.map((yc) => (
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
                        <Badge variant="destructive">
                          {SPONSORSHIP_PROGRESS_LABEL[yc.progress]}
                        </Badge>
                      </TableCell>
                      <TableCell>{yc.assignedMemberName ?? "未割当"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
