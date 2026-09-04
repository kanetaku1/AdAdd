"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { useActiveYear } from "@/components/active-year-provider"
import { useYearCatalog } from "@/components/year-catalog-provider"
import {
  ColumnFilterOption,
  ColumnFilterPopover,
} from "@/components/column-filter-header"
import { Badge } from "@/components/ui/badge"
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
import { EditableContractMenuStatusBadge } from "@/components/editable-contract-menu-status-badge"
import { EditableProductionTypeCell } from "@/components/editable-production-type-cell"
import { EditableQuantityCell } from "@/components/editable-quantity-cell"
import { useCurrentUser } from "@/components/current-user-provider"
import { EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import {
  updateContractMenu,
  updateContractMenuStatus,
} from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"

const ALLOWED_ROLES = ["SPONSORSHIP_MEMBER", "ADMINISTRATOR"]
import {
  CONTRACT_MENU_PRODUCTION_TYPE_LABEL,
  CONTRACT_MENU_STATUS_LABEL,
} from "@/lib/contract-menu-labels"
import type { ContractMenuProductionType, ContractMenuStatus } from "@/types/contract-menu"

const ALL = "ALL" as const
type ColumnFilterKey = "menu" | "productionType" | "status"

function isContractMenuStatus(
  value: string | null
): value is ContractMenuStatus {
  return value !== null && value in CONTRACT_MENU_STATUS_LABEL
}

/**
 * Contract Menu List (spec/frontend.md#Contract Menu Management).
 * Cross-contract view of every Contract Menu in the active Year
 * (spec/api.md#List Contract Menus Across a Year), for the Sponsorship Menu
 * Management Team to track production/submission status across all
 * companies at once (UC-07, UC-08) — not scoped to one Contract like the
 * table embedded in yearly-companies/[id]/page.tsx.
 *
 * Status is freely editable to any `ContractMenuStatus`, including
 * `SUBMITTED` (`PATCH /contract-menus/{id}/status`). Quantity and
 * production type are editable inline via `PATCH /contract-menus/{id}`
 * (spec/api.md#Update Contract Menu). Deliverable completeness is read from
 * Drive URL presence (no separate flag).
 *
 * Accepts `?menuId=&status=&companyName=` query params as initial filter
 * values, so the per-menu status breakdown and the follow-up list in
 * ad-material-progress/page.tsx can link straight into a filtered view of
 * this list.
 */
export default function ContractMenusPage() {
  return (
    <Suspense>
      <ContractMenusList />
    </Suspense>
  )
}

function ContractMenusList() {
  const searchParams = useSearchParams()
  const initialMenuId = searchParams.get("menuId")
  const initialStatus = searchParams.get("status")
  const initialCompanyName = searchParams.get("companyName")

  const { activeYear, loading: yearLoading, error: yearError } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const { currentUser } = useCurrentUser()
  const canManage = canAccess(currentUser?.roles, ALLOWED_ROLES)
  const {
    sponsorshipMenus,
    contractMenusAcrossYear,
    isSponsorshipMenusLoading,
    isContractMenusAcrossYearLoading,
    sponsorshipMenusError,
    contractMenusAcrossYearError,
    ensureSponsorshipMenus,
    ensureContractMenusAcrossYear,
    setContractMenusAcrossYear,
  } = useYearCatalog()
  const menus = sponsorshipMenus(activeYearId)
  const contractMenus = contractMenusAcrossYear(activeYearId)
  const catalogLoading =
    Boolean(activeYearId && isSponsorshipMenusLoading(activeYearId)) ||
    Boolean(activeYearId && isContractMenusAcrossYearLoading(activeYearId))
  const [error, setError] = useState<string | null>(null)

  const [companyNameQuery, setCompanyNameQuery] = useState(
    initialCompanyName ?? ""
  )
  const [menuFilter, setMenuFilter] = useState<string | typeof ALL>(
    initialMenuId ?? ALL
  )
  const [statusFilter, setStatusFilter] = useState<
    ContractMenuStatus | typeof ALL
  >(isContractMenuStatus(initialStatus) ? initialStatus : ALL)
  const [productionTypeFilter, setProductionTypeFilter] = useState<
    ContractMenuProductionType | typeof ALL
  >(ALL)
  const [openColumnFilter, setOpenColumnFilter] =
    useState<ColumnFilterKey | null>(null)


  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeYearId) return
    void Promise.all([
      ensureSponsorshipMenus(activeYearId),
      ensureContractMenusAcrossYear(activeYearId),
    ])
  }, [activeYearId, ensureSponsorshipMenus, ensureContractMenusAcrossYear])

  const companySuggestions = useMemo(() => {
    const names = Array.from(new Set(contractMenus.map((cm) => cm.companyName)))
    const query = companyNameQuery.trim().toLowerCase()
    if (!query) return []
    return names
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 8)
  }, [contractMenus, companyNameQuery])

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

  const hasActiveFilters =
    companyNameQuery.trim().length > 0 ||
    menuFilter !== ALL ||
    statusFilter !== ALL ||
    productionTypeFilter !== ALL

  function toggleColumnFilter(key: ColumnFilterKey) {
    setOpenColumnFilter((current) => (current === key ? null : key))
  }

  async function handleStatusChange(id: string, status: ContractMenuStatus) {
    if (!activeYearId) return
    setError(null)
    setSavingId(id)
    try {
      const updated = await updateContractMenuStatus(id, status)
      setContractMenusAcrossYear(
        activeYearId,
        contractMenus.map((cm) => (cm.id === id ? { ...cm, ...updated } : cm))
      )
    } catch (e) {
      setError(
        getErrorMessage(e, { fallback: "ステータスの更新に失敗しました" })
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleDetailsChange(
    id: string,
    patch: {
      quantity?: number
      productionType?: ContractMenuProductionType
    }
  ) {
    setError(null)
    setSavingId(id)
    try {
      const updated = await updateContractMenu(id, patch)
      if (!activeYearId) return
      setContractMenusAcrossYear(
        activeYearId,
        contractMenus.map((cm) => (cm.id === id ? { ...cm, ...updated } : cm))
      )
    } catch (e) {
      setError(
        getErrorMessage(e, {
          fallback: "メニューの更新に失敗しました",
          overrides: {
            CONFLICT:
              "入金確定済みのため、金額が変わる変更はできません。",
          },
        })
      )
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">広告管理</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}
          年度・契約済みの協賛メニューの制作・提出状況を横断管理
        </p>
      </div>

      <ErrorBanner
        message={
          yearError ||
          error ||
          (activeYearId
            ? sponsorshipMenusError(activeYearId) ||
              contractMenusAcrossYearError(activeYearId)
            : null)
        }
      />

      <div className="flex flex-col gap-3 rounded-md border bg-background p-3">
        <div className="min-w-56 max-w-md flex-1">
          <Input
            placeholder="企業名で検索"
            value={companyNameQuery}
            onChange={(e) => setCompanyNameQuery(e.target.value)}
          />
          {companyNameQuery.trim().length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {companySuggestions.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  候補が見つかりません
                </span>
              ) : (
                companySuggestions.map((name) => (
                  <Button
                    key={name}
                    size="xs"
                    variant="outline"
                    onClick={() => setCompanyNameQuery(name)}
                  >
                    {name}
                  </Button>
                ))
              )}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>適用中:</span>
            {companyNameQuery.trim() && (
              <Badge variant="secondary">会社名: {companyNameQuery}</Badge>
            )}
            {menuFilter !== ALL && (
              <Badge variant="secondary">
                メニュー:{" "}
                {menus.find((m) => m.id === menuFilter)?.name ?? "不明"}
              </Badge>
            )}
            {productionTypeFilter !== ALL && (
              <Badge variant="secondary">
                制作者:{" "}
                {CONTRACT_MENU_PRODUCTION_TYPE_LABEL[productionTypeFilter]}
              </Badge>
            )}
            {statusFilter !== ALL && (
              <Badge variant="secondary">
                ステータス: {CONTRACT_MENU_STATUS_LABEL[statusFilter]}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="rounded-md border [&_[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>
                <ColumnFilterPopover
                  label="メニュー"
                  active={menuFilter !== ALL}
                  open={openColumnFilter === "menu"}
                  onToggle={() => toggleColumnFilter("menu")}
                  onClose={() => setOpenColumnFilter(null)}
                >
                  {menus.map((m) => (
                    <ColumnFilterOption
                      key={m.id}
                      selected={menuFilter === m.id}
                      onSelect={() =>
                        setMenuFilter((current) =>
                          current === m.id ? ALL : m.id
                        )
                      }
                    >
                      {m.name}
                    </ColumnFilterOption>
                  ))}
                </ColumnFilterPopover>
              </TableHead>
              <TableHead>数量</TableHead>
              <TableHead>
                <ColumnFilterPopover
                  label="制作者"
                  active={productionTypeFilter !== ALL}
                  open={openColumnFilter === "productionType"}
                  onToggle={() => toggleColumnFilter("productionType")}
                  onClose={() => setOpenColumnFilter(null)}
                >
                  {Object.entries(CONTRACT_MENU_PRODUCTION_TYPE_LABEL).map(
                    ([value, label]) => (
                      <ColumnFilterOption
                        key={value}
                        selected={productionTypeFilter === value}
                        onSelect={() =>
                          setProductionTypeFilter((current) =>
                            current === value
                              ? ALL
                              : (value as ContractMenuProductionType)
                          )
                        }
                      >
                        {label}
                      </ColumnFilterOption>
                    )
                  )}
                </ColumnFilterPopover>
              </TableHead>
              <TableHead>
                <ColumnFilterPopover
                  label="ステータス"
                  active={statusFilter !== ALL}
                  open={openColumnFilter === "status"}
                  onToggle={() => toggleColumnFilter("status")}
                  onClose={() => setOpenColumnFilter(null)}
                >
                  {Object.entries(CONTRACT_MENU_STATUS_LABEL).map(
                    ([value, label]) => (
                      <ColumnFilterOption
                        key={value}
                        selected={statusFilter === value}
                        onSelect={() =>
                          setStatusFilter((current) =>
                            current === value
                              ? ALL
                              : (value as ContractMenuStatus)
                          )
                        }
                      >
                        {label}
                      </ColumnFilterOption>
                    )
                  )}
                </ColumnFilterPopover>
              </TableHead>
              <TableHead>
                資料(Google Drive)
                <span className="ml-1.5 font-normal text-muted-foreground">
                  （登録すると提出済みになります）
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || catalogLoading ? (
              <LoadingRow colSpan={7} />
            ) : !activeYearId ? (
              <EmptyRow
                colSpan={7}
                message="年度が未作成です。年度画面から作成してください。"
              />
            ) : visibleContractMenus.length === 0 ? (
              <EmptyRow colSpan={7} message="該当する契約メニューがありません。" />
            ) : (
              visibleContractMenus.map((cm) => {
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
                      {cm.assignedMemberName ? cm.assignedMemberName : (
                        <span className="text-muted-foreground">未割当</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cm.sponsorshipMenuName}
                        {cm.isGoodsSponsorship && (
                          <Badge variant="secondary">物品協賛</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EditableQuantityCell
                        value={cm.quantity}
                        disabled={savingId === cm.id || !canManage}
                        onChange={(quantity) =>
                          void handleDetailsChange(cm.id, { quantity })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <EditableProductionTypeCell
                        value={cm.productionType}
                        disabled={savingId === cm.id || !canManage}
                        onChange={(productionType) =>
                          void handleDetailsChange(cm.id, { productionType })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <EditableContractMenuStatusBadge
                        value={cm.status}
                        onChange={(status) =>
                          void handleStatusChange(cm.id, status)
                        }
                        disabled={savingId === cm.id || !canManage}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {cm.files && cm.files.length > 0 ? (
                          cm.files.map((file, idx) => (
                            <Badge key={idx} variant="outline" className="flex items-center gap-1 whitespace-nowrap bg-green-50 text-green-700 border-green-200" title={file.driveFileName}>
                              <a
                                href={file.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                素材{idx + 1}
                              </a>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
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
