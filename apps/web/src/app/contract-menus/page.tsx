"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useActiveYear } from "@/components/active-year-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditableContractMenuStatusBadge } from "@/components/editable-contract-menu-status-badge"
import {
  listContractMenusAcrossYear,
  updateContractMenuProduction,
  updateContractMenuStatus,
} from "@/lib/data/sponsorship"
import { listSponsorshipMenus } from "@/lib/data/sponsorship-menus"
import {
  CONTRACT_MENU_PRODUCTION_TYPE_LABEL,
  CONTRACT_MENU_STATUS_LABEL,
} from "@/lib/contract-menu-labels"
import type {
  ContractMenuAcrossYear,
  ContractMenuProductionType,
  ContractMenuStatus,
} from "@/types/contract-menu"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

const ALL = "ALL" as const

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

/**
 * Contract Menu List (spec/frontend.md#Contract Menu Management).
 * Cross-contract view of every Contract Menu in the active Year
 * (spec/api.md#List Contract Menus Across a Year), for the Sponsorship Menu
 * Management Team to track production/submission status across all
 * companies at once (UC-07, UC-08) — not scoped to one Contract like the
 * table embedded in yearly-companies/[id]/page.tsx.
 *
 * Status is freely editable to any `ContractMenuStatus`, including
 * `SUBMITTED` directly (`PATCH /contract-menus/{id}/status`,
 * spec/api.md#Update Contract Menu Status). Production type has no update
 * endpoint — it's only set at creation (`POST /contracts/{contractId}/menus`)
 * — so it's read-only here, matching ContractMenuSection on the Yearly
 * Company detail page. Registering a Drive folder URL always finalizes the
 * item: the backend's `PATCH .../production` sets `status` to `SUBMITTED`
 * as part of that same call (spec/api.md#Upload Production Information), so
 * saving a Drive URL here updates both fields together.
 */
export default function ContractMenusPage() {
  const { activeYear, loading: yearLoading, error: yearError } = useActiveYear()
  const activeYearId = activeYear?.id ?? null

  const [contractMenus, setContractMenus] = useState<ContractMenuAcrossYear[]>(
    []
  )
  const [menus, setMenus] = useState<SponsorshipMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [companyNameQuery, setCompanyNameQuery] = useState("")
  const [menuFilter, setMenuFilter] = useState<string | typeof ALL>(ALL)
  const [statusFilter, setStatusFilter] = useState<
    ContractMenuStatus | typeof ALL
  >(ALL)
  const [productionTypeFilter, setProductionTypeFilter] = useState<
    ContractMenuProductionType | typeof ALL
  >(ALL)

  const [driveUrlDrafts, setDriveUrlDrafts] = useState<Record<string, string>>(
    {}
  )
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setContractMenus([])
        setMenus([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [menuList, contractMenuList] = await Promise.all([
          listSponsorshipMenus(yearId),
          listContractMenusAcrossYear(yearId),
        ])
        if (cancelled) return
        setMenus(menuList)
        setContractMenus(contractMenuList)
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

  const visibleContractMenus = contractMenus.filter((cm) => {
    return (
      (menuFilter === ALL || cm.sponsorshipMenuId === menuFilter) &&
      (statusFilter === ALL || cm.status === statusFilter) &&
      (productionTypeFilter === ALL ||
        cm.productionType === productionTypeFilter) &&
      (companyNameQuery.trim()
        ? cm.companyName
            .toLowerCase()
            .includes(companyNameQuery.trim().toLowerCase())
        : true)
    )
  })

  async function handleStatusChange(id: string, status: ContractMenuStatus) {
    setError(null)
    try {
      const updated = await updateContractMenuStatus(id, status)
      setContractMenus((prev) =>
        prev.map((cm) => (cm.id === id ? { ...cm, ...updated } : cm))
      )
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "ステータスの更新に失敗しました"
      )
    }
  }

  async function handleDriveUrlSave(id: string) {
    const draft = driveUrlDrafts[id]?.trim()
    if (!draft) return
    setSavingId(id)
    setError(null)
    try {
      const current = contractMenus.find((cm) => cm.id === id)
      const updated = await updateContractMenuProduction(id, {
        driveFolderUrl: draft,
        remarks: current?.remarks ?? "",
      })
      setContractMenus((prev) =>
        prev.map((cm) => (cm.id === id ? { ...cm, ...updated } : cm))
      )
      setDriveUrlDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drive URLの更新に失敗しました")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Contract Menus</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}
          年度・契約済みの協賛メニューの制作・提出状況を横断管理
        </p>
      </div>

      {(yearError || error) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {yearError || error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="企業名で検索"
          value={companyNameQuery}
          onChange={(e) => setCompanyNameQuery(e.target.value)}
          className="max-w-56"
        />

        <Select
          value={menuFilter}
          onValueChange={(value) => setMenuFilter(value ?? ALL)}
          items={{
            [ALL]: "すべてのメニュー",
            ...Object.fromEntries(menus.map((m) => [m.id, m.name])),
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="メニュー" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべてのメニュー</SelectItem>
            {menus.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as ContractMenuStatus | typeof ALL)
          }
          items={{ [ALL]: "すべてのステータス", ...CONTRACT_MENU_STATUS_LABEL }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべてのステータス</SelectItem>
            {Object.entries(CONTRACT_MENU_STATUS_LABEL).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select
          value={productionTypeFilter}
          onValueChange={(value) =>
            setProductionTypeFilter(
              value as ContractMenuProductionType | typeof ALL
            )
          }
          items={{
            [ALL]: "すべての制作者",
            ...CONTRACT_MENU_PRODUCTION_TYPE_LABEL,
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="制作者" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべての制作者</SelectItem>
            {Object.entries(CONTRACT_MENU_PRODUCTION_TYPE_LABEL).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>メニュー</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>単価</TableHead>
              <TableHead>制作者</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>
                Drive URL
                <span className="ml-1.5 font-normal text-muted-foreground">
                  （登録すると提出済みになります）
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : !activeYearId ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  年度が未作成です。Years から年度を作成してください。
                </TableCell>
              </TableRow>
            ) : visibleContractMenus.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  該当する契約メニューがありません。
                </TableCell>
              </TableRow>
            ) : (
              visibleContractMenus.map((cm) => {
                const draft = driveUrlDrafts[cm.id]
                const hasUnsavedDraft =
                  draft !== undefined && draft.trim() !== (cm.driveUrl ?? "")
                return (
                  <TableRow key={cm.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/yearly-companies/${cm.yearlyCompanyId}`}
                        className="hover:underline"
                      >
                        {cm.companyName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cm.sponsorshipMenuName}
                        {cm.isGoodsSponsorship && (
                          <Badge variant="secondary">物品協賛</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{cm.quantity}</TableCell>
                    <TableCell>
                      {currencyFormatter.format(cm.unitPrice)}
                    </TableCell>
                    <TableCell>
                      {cm.productionType
                        ? CONTRACT_MENU_PRODUCTION_TYPE_LABEL[cm.productionType]
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <EditableContractMenuStatusBadge
                        value={cm.status}
                        onChange={(status) =>
                          void handleStatusChange(cm.id, status)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          value={draft ?? cm.driveUrl ?? ""}
                          placeholder="Drive URL"
                          onChange={(e) =>
                            setDriveUrlDrafts((prev) => ({
                              ...prev,
                              [cm.id]: e.target.value,
                            }))
                          }
                        />
                        {hasUnsavedDraft && (
                          <Button
                            size="sm"
                            onClick={() => void handleDriveUrlSave(cm.id)}
                            disabled={savingId === cm.id}
                          >
                            保存
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
