"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useActiveYear } from "@/components/active-year-provider"
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
import { getCurrentDevUserId } from "@/lib/api/client"
import { listAdvisorAssignmentsByYear } from "@/lib/data/advisor-assignments"
import {
  listContractMenusAcrossYear,
  listYearlyCompaniesByYear,
} from "@/lib/data/sponsorship"
import { listSponsorshipMenus } from "@/lib/data/sponsorship-menus"
import { CONTRACT_MENU_STATUS_LABEL } from "@/lib/contract-menu-labels"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
import type { YearlyCompany } from "@/types/yearly-company"
import type {
  ContractMenuAcrossYear,
  ContractMenuStatus,
} from "@/types/contract-menu"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

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

const UNASSIGNED_KEY = "UNASSIGNED"

/**
 * Ad Material Progress (spec/frontend.md#Ad Material Progress, UC-07/UC-08).
 * Cross-menu view of Contract Menu production/submission status for the
 * Sponsorship Menu Management Department, split out from the main Dashboard
 * (spec/frontend.md#Dashboard) since the two serve different departments.
 */
export default function AdMaterialProgressPage() {
  const { activeYear, loading: yearLoading, error: yearError } = useActiveYear()
  const activeYearId = activeYear?.id ?? null

  const [menus, setMenus] = useState<SponsorshipMenu[]>([])
  const [contractMenus, setContractMenus] = useState<ContractMenuAcrossYear[]>(
    []
  )
  const [yearlyCompanies, setYearlyCompanies] = useState<YearlyCompany[]>([])
  const [advisorAssignments, setAdvisorAssignments] = useState<
    AdvisorAssignment[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scopeOverride, setScopeOverride] = useState<boolean | null>(null)

  const currentUserId = getCurrentDevUserId()

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setMenus([])
        setContractMenus([])
        setYearlyCompanies([])
        setAdvisorAssignments([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [menuList, contractMenuList, ycList, advisorAssignmentList] =
          await Promise.all([
            listSponsorshipMenus(yearId),
            listContractMenusAcrossYear(yearId),
            listYearlyCompaniesByYear(yearId),
            listAdvisorAssignmentsByYear(yearId),
          ])
        if (cancelled) return
        setMenus(menuList)
        setContractMenus(contractMenuList)
        setYearlyCompanies(ycList)
        setAdvisorAssignments(advisorAssignmentList)
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
  const memberNameByKey = new Map<string, string>()
  for (const cm of contractMenus) {
    if (cm.status === "SUBMITTED") continue
    const yc = yearlyCompanyById.get(cm.yearlyCompanyId)
    const key = yc?.assignedMemberId ?? UNASSIGNED_KEY
    memberNameByKey.set(key, yc?.assignedMemberName ?? "未割当")
    if (!followUpByMember.has(key)) {
      followUpByMember.set(key, new Map())
    }
    const companies = followUpByMember.get(key)!
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

  // Members this User supervises as a Sponsorship Advisor (spec/domain.md
  // Rule 9 — an Advisor is never assigned to a Company directly, only
  // indirectly through the Members they supervise).
  const supervisedMemberIds = new Set(
    advisorAssignments
      .filter((a) => a.advisorId === currentUserId)
      .map((a) => a.memberId)
  )
  const myScopeMemberIds = new Set([currentUserId, ...supervisedMemberIds])

  // "未割当" last so an unassigned company is never the easiest one to miss.
  const followUpGroups = Array.from(followUpByMember.entries())
    .map(([key, companies]) => ({
      memberId: key === UNASSIGNED_KEY ? null : key,
      member: memberNameByKey.get(key)!,
      companies: Array.from(companies.values()),
    }))
    .sort((a, b) => {
      if (a.memberId === null) return 1
      if (b.memberId === null) return -1
      return b.companies.length - a.companies.length
    })

  // Default to the scoped view only when the signed-in User actually has a
  // stake (their own assignment, or a Member they supervise) in this Year —
  // otherwise defaulting to "mine" would just show an empty list.
  const hasOwnStake = followUpGroups.some(
    (g) => g.memberId !== null && myScopeMemberIds.has(g.memberId)
  )
  const scopeToMine = scopeOverride ?? hasOwnStake
  const visibleFollowUpGroups = scopeToMine
    ? followUpGroups.filter(
        (g) => g.memberId !== null && myScopeMemberIds.has(g.memberId)
      )
    : followUpGroups

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ad Material Progress</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}年度・全{menus.length}協賛メニューの広告データ提出状況
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
            <h2 className="mb-3 font-medium">ステータス別サマリ</h2>
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
            <h2 className="mb-1 font-medium">協賛メニュー別ステータス内訳</h2>
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
                  menuBreakdown.map(({ menu, counts, total, submittedRatio }) => (
                    <TableRow key={menu.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {menu.name}
                      </TableCell>
                      {STATUS_ORDER.map((status) => (
                        <TableCell key={status} className="text-center">
                          {counts[status] > 0 ? (
                            <Link
                              href={`/contract-menus?menuId=${menu.id}&status=${status}`}
                              className={`font-semibold tabular-nums hover:underline ${STATUS_TEXT_CLASS[status]}`}
                            >
                              {counts[status]}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">0</span>
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
                                style={{ width: `${submittedRatio * 100}%` }}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-md border p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-medium">要フォロー — 担当メンバー別</h2>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                自分の担当のみ
                <Switch
                  checked={scopeToMine}
                  onCheckedChange={(checked) => setScopeOverride(checked)}
                />
              </label>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              提出済み以外のContract
              Menuを1件以上持つ企業を、担当実働メンバーごとに表示しています。
              {scopeToMine &&
                "自分が担当、またはアドバイザーとしてsuperviseするメンバーの分のみ表示中です。"}
            </p>
            {visibleFollowUpGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {scopeToMine
                  ? "自分の担当分に、現在フォローが必要な広告データはありません。"
                  : "現在、未提出の広告データはありません。"}
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {visibleFollowUpGroups.map(({ memberId, member, companies }) => (
                  <div key={memberId ?? UNASSIGNED_KEY}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <div className="font-medium">
                        {member}
                        {memberId !== null && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {memberId === currentUserId
                              ? "あなたの担当"
                              : supervisedMemberIds.has(memberId)
                                ? "supervise先の実働メンバー"
                                : "実働メンバー"}
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
  )
}
