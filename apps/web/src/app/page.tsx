"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useActiveYear } from "@/components/active-year-provider"
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
import {
  listContractMenusAcrossYear,
  listYearlyCompaniesByYear,
} from "@/lib/data/sponsorship"
import { listSponsorshipMenus } from "@/lib/data/sponsorship-menus"
import { SPONSORSHIP_PROGRESS_LABEL } from "@/lib/yearly-company-labels"
import { CONTRACT_MENU_STATUS_LABEL } from "@/lib/contract-menu-labels"
import type { SponsorshipProgress, YearlyCompany } from "@/types/yearly-company"
import type {
  ContractMenuAcrossYear,
  ContractMenuStatus,
} from "@/types/contract-menu"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

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

/**
 * Left(not started) -> right(done) so a plan's row scans as a temperature
 * gradient (spec/frontend.md#Ad Material Progress).
 */
const STATUS_ORDER: ContractMenuStatus[] = [
  "WAITING",
  "REQUESTED",
  "PRODUCING",
  "COMPLETED",
  "SUBMITTED",
]

const STATUS_DOT_CLASS: Record<ContractMenuStatus, string> = {
  WAITING: "bg-muted-foreground/50",
  REQUESTED: "bg-amber-500",
  PRODUCING: "bg-blue-500",
  COMPLETED: "bg-teal-500",
  SUBMITTED: "bg-emerald-500",
}

const STATUS_TEXT_CLASS: Record<ContractMenuStatus, string> = {
  WAITING: "text-muted-foreground",
  REQUESTED: "text-amber-600 dark:text-amber-400",
  PRODUCING: "text-blue-600 dark:text-blue-400",
  COMPLETED: "text-teal-600 dark:text-teal-400",
  SUBMITTED: "text-emerald-600 dark:text-emerald-400",
}

function StatTile({
  label,
  value,
  dotClassName,
}: {
  label: string
  value: string
  dotClassName?: string
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {dotClassName && (
          <span className={`size-1.5 shrink-0 rounded-full ${dotClassName}`} />
        )}
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold">{value}</div>
    </div>
  )
}

type MenuBreakdown = {
  menu: SponsorshipMenu
  counts: Record<ContractMenuStatus, number>
  total: number
  submittedRatio: number | null
}

type FollowUpCompany = {
  yearlyCompanyId: string
  companyName: string
  pending: Array<{ menuName: string; status: ContractMenuStatus }>
}

/**
 * Dashboard (spec/frontend.md#Dashboard). Company Management Department view
 * (auth/RBAC not yet implemented — see earlier decision to default to full
 * access until roles exist). Aggregates data already shown elsewhere
 * (Yearly Companies, Sponsorship Contracts, Finance) rather than introducing
 * new persisted state.
 *
 * The Ad Material Progress section (spec/frontend.md#Ad Material Progress)
 * is year-scoped and API-connected (GET /years/{yearId}/contract-menus,
 * Issue #11); the rest of the dashboard above it still reads mock data
 * directly and is not yet year-scoped — a separate follow-up.
 *
 * TODO: once auth exists, scope this to the logged-in user's role
 * (General Member / Advisor dashboards per spec/frontend.md).
 */
export default function DashboardPage() {
  const { activeYear, loading: yearLoading, error: yearError } = useActiveYear()
  const activeYearId = activeYear?.id ?? null

  const [menus, setMenus] = useState<SponsorshipMenu[]>([])
  const [contractMenus, setContractMenus] = useState<ContractMenuAcrossYear[]>(
    []
  )
  const [yearlyCompanies, setYearlyCompanies] = useState<YearlyCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setMenus([])
        setContractMenus([])
        setYearlyCompanies([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [menuList, contractMenuList, ycList] = await Promise.all([
          listSponsorshipMenus(yearId),
          listContractMenusAcrossYear(yearId),
          listYearlyCompaniesByYear(yearId),
        ])
        if (cancelled) return
        setMenus(menuList)
        setContractMenus(contractMenuList)
        setYearlyCompanies(ycList)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "読み込みに失敗しました")
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

  // ---- Ad Material Progress derivations ----

  const statusSummary = STATUS_ORDER.map((status) => ({
    status,
    count: contractMenus.filter((cm) => cm.status === status).length,
  }))

  const menuBreakdown: MenuBreakdown[] = menus
    .map((menu) => {
      const rows = contractMenus.filter(
        (cm) => cm.sponsorshipMenuId === menu.id
      )
      const counts = STATUS_ORDER.reduce(
        (acc, status) => {
          acc[status] = rows.filter((r) => r.status === status).length
          return acc
        },
        {} as Record<ContractMenuStatus, number>
      )
      const total = rows.length
      const submitted = counts.SUBMITTED
      return {
        menu,
        counts,
        total,
        submittedRatio: total > 0 ? submitted / total : null,
      }
    })
    .sort((a, b) => {
      // Menus with no contracts yet carry nothing to act on — push last.
      if (a.submittedRatio === null) return 1
      if (b.submittedRatio === null) return -1
      return a.submittedRatio - b.submittedRatio
    })

  const yearlyCompanyById = new Map(yearlyCompanies.map((yc) => [yc.id, yc]))
  const followUpByMember = new Map<string, Map<string, FollowUpCompany>>()
  for (const cm of contractMenus) {
    if (cm.status === "SUBMITTED") continue
    const yc = yearlyCompanyById.get(cm.yearlyCompanyId)
    const member = yc?.assignedMemberName ?? "未割当"
    if (!followUpByMember.has(member)) {
      followUpByMember.set(member, new Map())
    }
    const companies = followUpByMember.get(member)!
    if (!companies.has(cm.yearlyCompanyId)) {
      companies.set(cm.yearlyCompanyId, {
        yearlyCompanyId: cm.yearlyCompanyId,
        companyName: cm.companyName,
        pending: [],
      })
    }
    companies
      .get(cm.yearlyCompanyId)!
      .pending.push({ menuName: cm.sponsorshipMenuName, status: cm.status })
  }
  // "未割当" last so an unassigned company is never the easiest one to miss.
  const followUpGroups = Array.from(followUpByMember.entries())
    .map(([member, companies]) => ({
      member,
      companies: Array.from(companies.values()),
    }))
    .sort((a, b) => {
      if (a.member === "未割当") return 1
      if (b.member === "未割当") return -1
      return b.companies.length - a.companies.length
    })

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

      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-lg font-medium">広告データ進捗</h2>
          <p className="text-sm text-muted-foreground">
            {activeYear?.name ?? ""}年度・全{menus.length}協賛メニューの提出状況
          </p>
        </div>

        {(yearError || error) && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {yearError || error}
          </p>
        )}

        {yearLoading || loading ? (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            読み込み中…
          </p>
        ) : !activeYearId ? (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            年度が未作成です。Years から年度を作成してください。
          </p>
        ) : (
          <>
            <div className="rounded-md border p-4">
              <h3 className="mb-3 font-medium">ステータス別サマリ</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {statusSummary.map(({ status, count }) => (
                  <StatTile
                    key={status}
                    label={CONTRACT_MENU_STATUS_LABEL[status]}
                    value={`${count}件`}
                    dotClassName={STATUS_DOT_CLASS[status]}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-md border p-4">
              <h3 className="mb-1 font-medium">協賛メニュー別ステータス内訳</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                提出率が低いメニューほど上に表示しています。
              </p>
              <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>協賛メニュー</TableHead>
                      {STATUS_ORDER.map((status) => (
                        <TableHead key={status} className="text-center">
                          {CONTRACT_MENU_STATUS_LABEL[status]}
                        </TableHead>
                      ))}
                      <TableHead>提出率</TableHead>
                      <TableHead className="text-right">契約数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={STATUS_ORDER.length + 3}
                          className="text-center text-muted-foreground"
                        >
                          協賛メニューがまだありません。
                        </TableCell>
                      </TableRow>
                    ) : (
                      menuBreakdown.map(
                        ({ menu, counts, total, submittedRatio }) => (
                          <TableRow key={menu.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {menu.name}
                            </TableCell>
                            {STATUS_ORDER.map((status) => (
                              <TableCell key={status} className="text-center">
                                {counts[status] > 0 ? (
                                  <span
                                    className={`font-semibold tabular-nums ${STATUS_TEXT_CLASS[status]}`}
                                  >
                                    {counts[status]}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    0
                                  </span>
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="min-w-36">
                              {submittedRatio === null ? (
                                <span className="text-sm text-muted-foreground">
                                  契約なし
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <div className="h-1.5 rounded bg-muted">
                                    <div
                                      className="h-1.5 rounded bg-emerald-500"
                                      style={{
                                        width: `${submittedRatio * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {counts.SUBMITTED} / {total} 件
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {total}
                            </TableCell>
                          </TableRow>
                        )
                      )
                    )}
                  </TableBody>
              </Table>
            </div>

            <div className="rounded-md border p-4">
              <h3 className="mb-1 font-medium">要フォロー — 担当メンバー別</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                提出済み以外のContract
                Menuを1件以上持つ企業を、担当実働メンバーごとに表示しています。
              </p>
              {followUpGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  現在、未提出の広告データはありません。
                </p>
              ) : (
                <div className="flex flex-col gap-5">
                  {followUpGroups.map(({ member, companies }) => (
                    <div key={member}>
                      <div className="mb-2 flex items-baseline justify-between">
                        <div className="font-medium">
                          {member}
                          {member !== "未割当" && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              実働メンバー
                            </span>
                          )}
                        </div>
                        <Badge variant="destructive">
                          {companies.length}社が未提出
                        </Badge>
                      </div>
                      <Table>
                        <TableBody>
                          {companies.map((c) => (
                            <TableRow key={c.yearlyCompanyId}>
                              <TableCell className="w-56 font-medium">
                                <Link
                                  href={`/yearly-companies/${c.yearlyCompanyId}`}
                                  className="hover:underline"
                                >
                                  {c.companyName}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {c.pending.map((p, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <span>{p.menuName}</span>
                                      <span
                                        className={`text-xs ${STATUS_TEXT_CLASS[p.status]}`}
                                      >
                                        {CONTRACT_MENU_STATUS_LABEL[p.status]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
