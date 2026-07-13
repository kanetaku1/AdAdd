import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import { mockPayments } from "@/lib/mock/payments"
import { SPONSORSHIP_PROGRESS_LABEL } from "@/lib/yearly-company-labels"
import type { SponsorshipProgress } from "@/types/yearly-company"

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
 * Dashboard (spec/frontend.md#Dashboard). Company Management Department view
 * (auth/RBAC not yet implemented — see earlier decision to default to full
 * access until roles exist). Aggregates data already shown elsewhere
 * (Yearly Companies, Sponsorship Contracts, Finance) rather than introducing
 * new persisted state.
 *
 * TODO: once auth exists, scope this to the logged-in user's role
 * (General Member / Advisor dashboards per spec/frontend.md).
 */
export default function DashboardPage() {
  const totalCompanies = mockYearlyCompanies.length
  const totalContractAmount = mockSponsorshipContracts.reduce(
    (sum, c) => sum + c.totalAmount,
    0
  )
  const confirmedPayments = mockPayments.filter(
    (p) => p.status === "CONFIRMED"
  ).length
  const waitingPayments = mockPayments.filter(
    (p) => p.status === "WAITING"
  ).length

  const progressCounts = PROGRESS_ORDER.map((progress) => ({
    progress,
    count: mockYearlyCompanies.filter((yc) => yc.progress === progress).length,
  }))
  const maxProgressCount = Math.max(1, ...progressCounts.map((p) => p.count))

  const memberWorkload = Array.from(
    mockYearlyCompanies.reduce((map, yc) => {
      const member = yc.assignedMemberName ?? "未割当"
      map.set(member, (map.get(member) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1])

  const attentionCompanies = mockYearlyCompanies.filter((yc) =>
    ATTENTION_PROGRESS.includes(yc.progress)
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">2026年度 協賛活動サマリ</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="協賛企業数" value={`${totalCompanies}社`} />
        <StatTile
          label="契約金額合計"
          value={currencyFormatter.format(totalContractAmount)}
        />
        <StatTile label="入金確認済み" value={`${confirmedPayments}件`} />
        <StatTile label="入金待ち" value={`${waitingPayments}件`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border p-4">
          <h2 className="mb-3 font-medium">進捗の内訳</h2>
          <div className="flex flex-col gap-2">
            {progressCounts.map(({ progress, count }) => (
              <div key={progress} className="flex items-center gap-2">
                <div className="w-28 shrink-0 text-sm text-muted-foreground">
                  {SPONSORSHIP_PROGRESS_LABEL[progress]}
                </div>
                <div className="h-4 flex-1 rounded bg-muted">
                  <div
                    className="h-4 rounded bg-primary"
                    style={{
                      width: `${(count / maxProgressCount) * 100}%`,
                    }}
                  />
                </div>
                <div className="w-8 shrink-0 text-right text-sm">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border p-4">
          <h2 className="mb-3 font-medium">担当メンバーごとの持ち分</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>担当メンバー</TableHead>
                <TableHead className="text-right">担当企業数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberWorkload.map(([member, count]) => (
                <TableRow key={member}>
                  <TableCell>{member}</TableCell>
                  <TableCell className="text-right">{count}社</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-md border p-4">
        <h2 className="mb-3 font-medium">要対応の企業</h2>
        {attentionCompanies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            現在、要対応の企業はありません。
          </p>
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
    </div>
  )
}
