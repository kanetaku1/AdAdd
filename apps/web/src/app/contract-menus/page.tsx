"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

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
import { EditableProductionDepartmentCell } from "@/components/editable-production-department-cell"
import { EditableQuantityCell } from "@/components/editable-quantity-cell"
import { useCurrentUser } from "@/components/current-user-provider"
import { EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import { PastYearNotice } from "@/components/past-year-notice"
import {
  updateContractMenu,
  updateContractMenuProductionDepartment,
  updateContractMenuStatus,
} from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"
import { useSelectedYear } from "@/hooks/use-selected-year"
import { downloadCsv } from "@/lib/csv"
import { ContractMenuFilesSummary } from "@/components/contract-menu-files-summary"

const ALLOWED_ROLES = ["SPONSORSHIP_MEMBER", "ADMINISTRATOR"]
const STATUS_ALLOWED_ROLES = ["ADVERTISEMENT_MANAGER", "ADMINISTRATOR"]
import {
  CONTRACT_MENU_PRODUCTION_DEPARTMENT_LABEL,
  CONTRACT_MENU_PRODUCTION_TYPE_LABEL,
  CONTRACT_MENU_STATUS_LABEL,
  getContractMenuStatusLabel,
} from "@/lib/contract-menu-labels"
import type {
  ContractMenuProductionDepartment,
  ContractMenuProductionType,
  ContractMenuStatus,
} from "@/types/contract-menu"

const ALL = "ALL" as const
type ColumnFilterKey = "menu" | "productionType" | "status"
type ContextualStatusFilter =
  | "AD_WAITING"
  | "AD_PROVISIONAL_SUBMITTED"
  | "MATERIAL_WAITING"
  | "MATERIAL_PROVISIONAL_SUBMITTED"
type StatusFilter = ContractMenuStatus | ContextualStatusFilter | typeof ALL

const AD_MANAGEMENT_STATUS_FILTERS: Array<{
  value: Exclude<StatusFilter, typeof ALL>
  label: string
}> = [
  { value: "AD_WAITING", label: "広告データ提出待ち" },
  { value: "AD_PROVISIONAL_SUBMITTED", label: "広告データ仮提出済み" },
  { value: "MATERIAL_WAITING", label: "素材データ提出待ち" },
  { value: "MATERIAL_PROVISIONAL_SUBMITTED", label: "素材データ仮提出済み" },
  { value: "MATERIAL_COMPLETED", label: "素材データ完成" },
  { value: "REQUESTED", label: "制作依頼済み" },
  { value: "COMPANY_REVIEWING", label: "企業への確認中" },
  { value: "COMPLETED", label: "完成" },
]

const MANUALLY_SELECTABLE_STATUSES = (
  Object.keys(CONTRACT_MENU_STATUS_LABEL) as ContractMenuStatus[]
).filter((status) => status !== "SUBMITTED")

const AUTOMATIC_STATUSES = new Set<ContractMenuStatus>([
  "PROVISIONAL_SUBMITTED",
  "MATERIAL_COMPLETED",
  "COMPLETED",
])

function matchesStatusFilter(
  cm: {
    status: ContractMenuStatus
    productionType: ContractMenuProductionType | null
  },
  filter: StatusFilter
): boolean {
  if (filter === ALL) return true
  const isAdData =
    cm.productionType === "COMPANY" || cm.productionType === "CONTINUED"
  if (filter === "AD_WAITING") {
    return cm.status === "WAITING" && isAdData
  }
  if (filter === "AD_PROVISIONAL_SUBMITTED") {
    return cm.status === "PROVISIONAL_SUBMITTED" && isAdData
  }
  if (filter === "MATERIAL_WAITING") {
    return cm.status === "WAITING" && cm.productionType === "INTERNAL"
  }
  if (filter === "MATERIAL_PROVISIONAL_SUBMITTED") {
    return (
      cm.status === "PROVISIONAL_SUBMITTED" &&
      cm.productionType === "INTERNAL"
    )
  }
  return cm.status === filter
}

function statusFilterLabel(filter: Exclude<StatusFilter, typeof ALL>): string {
  return (
    AD_MANAGEMENT_STATUS_FILTERS.find((option) => option.value === filter)
      ?.label ??
    (filter in CONTRACT_MENU_STATUS_LABEL
      ? CONTRACT_MENU_STATUS_LABEL[filter as ContractMenuStatus]
      : filter)
  )
}

function isContractMenuStatus(
  value: string | null
): value is ContractMenuStatus {
  return value !== null && value in CONTRACT_MENU_STATUS_LABEL
}

/**
 * Contract Menu List (spec/frontend.md#Contract Menu Management).
 * Cross-contract view of every Contract Menu in the selected Year
 * (spec/api.md#List Contract Menus Across a Year), for the Sponsorship Menu
 * Advertisement Management to track production/submission status across all
 * companies at once (UC-07, UC-08) — not scoped to one Contract like the
 * table embedded in yearly-companies/[id]/page.tsx.
 *
 * Status and production department controls follow the per-production-type
 * rules in spec/frontend.md#Contract Menu List. Production type is read-only
 * here. Materials use a count-first compact display, shared with Yearly
 * Company Detail and CSV export.
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

  const {
    selectedYear,
    selectedYearId: activeYearId,
    isPastYear,
    invalidYearSelection,
    yearLoading,
    yearError,
  } = useSelectedYear()
  const { currentUser } = useCurrentUser()
  const canManage = !isPastYear && canAccess(currentUser?.roles, ALLOWED_ROLES)
  const canManageStatus =
    !isPastYear && canAccess(currentUser?.roles, STATUS_ALLOWED_ROLES)
  const {
    sponsorshipMenus: sponsorshipMenusCache,
    contractMenusAcrossYear: contractMenusCache,
  } = useYearCatalog()
  const menus = sponsorshipMenusCache.data(activeYearId)
  const contractMenus = contractMenusCache.data(activeYearId)
  const catalogLoading =
    Boolean(activeYearId && sponsorshipMenusCache.isLoading(activeYearId)) ||
    Boolean(activeYearId && contractMenusCache.isLoading(activeYearId))
  const [error, setError] = useState<string | null>(null)

  const [companyNameQuery, setCompanyNameQuery] = useState(
    initialCompanyName ?? ""
  )
  const [menuFilter, setMenuFilter] = useState<string | typeof ALL>(
    initialMenuId ?? ALL
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isContractMenuStatus(initialStatus) ? initialStatus : ALL
  )
  const [productionTypeFilter, setProductionTypeFilter] = useState<
    ContractMenuProductionType | typeof ALL
  >(ALL)
  const [productionDepartmentFilter, setProductionDepartmentFilter] =
    useState<ContractMenuProductionDepartment | null>(null)
  const [showProductionDepartments, setShowProductionDepartments] =
    useState(false)
  const [openColumnFilter, setOpenColumnFilter] =
    useState<ColumnFilterKey | null>(null)


  const [savingId, setSavingId] = useState<string | null>(null)
  useEffect(() => {
    if (!activeYearId) return
    void Promise.all([
      sponsorshipMenusCache.ensure(activeYearId),
      contractMenusCache.ensure(activeYearId),
    ])
  }, [activeYearId, sponsorshipMenusCache, contractMenusCache])

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
      matchesStatusFilter(cm, statusFilter) &&
      (productionTypeFilter === ALL ||
        cm.productionType === productionTypeFilter) &&
      (!productionDepartmentFilter ||
        cm.productionDepartment === productionDepartmentFilter) &&
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
    productionTypeFilter !== ALL ||
    productionDepartmentFilter !== null

  function toggleColumnFilter(key: ColumnFilterKey) {
    setShowProductionDepartments(false)
    setOpenColumnFilter((current) => (current === key ? null : key))
  }

  async function handleStatusChange(id: string, status: ContractMenuStatus) {
    if (!activeYearId) return
    const acknowledgeAutomaticState = AUTOMATIC_STATUSES.has(status)
    if (
      acknowledgeAutomaticState &&
      !window.confirm(
        `「${getContractMenuStatusLabel(status, contractMenus.find((cm) => cm.id === id)?.productionType)}」は通常、自動で切り替わるステータスです。すでに終了している工程へ戻る可能性がありますが、手動で変更しますか？`
      )
    ) {
      return
    }
    setError(null)
    setSavingId(id)
    try {
      const updated = await updateContractMenuStatus(
        id,
        status,
        acknowledgeAutomaticState
      )
      contractMenusCache.set(
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
    patch: { quantity?: number }
  ) {
    setError(null)
    setSavingId(id)
    try {
      const updated = await updateContractMenu(id, patch)
      if (!activeYearId) return
      contractMenusCache.set(
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

  async function handleProductionDepartmentChange(
    id: string,
    productionDepartment: ContractMenuProductionDepartment | null
  ) {
    if (!activeYearId) return
    setError(null)
    setSavingId(id)
    try {
      const updated = await updateContractMenuProductionDepartment(
        id,
        productionDepartment
      )
      contractMenusCache.set(
        activeYearId,
        contractMenus.map((cm) => (cm.id === id ? { ...cm, ...updated } : cm))
      )
    } catch (e) {
      setError(
        getErrorMessage(e, {
          fallback: "制作部門の更新に失敗しました",
        })
      )
    } finally {
      setSavingId(null)
    }
  }

  function handleCsvExport() {
    downloadCsv(
      `広告管理-${selectedYear?.name ?? "年度"}.csv`,
      ["会社名", "担当者", "メニュー", "数量", "制作者", "ステータス", "資料"],
      visibleContractMenus.map((cm) => [
        cm.companyName,
        cm.assignedMemberName ?? "未割当",
        cm.sponsorshipMenuName,
        String(cm.quantity),
        cm.productionType
          ? CONTRACT_MENU_PRODUCTION_TYPE_LABEL[cm.productionType]
          : "-",
        cm.productionType === null
          ? "-"
          : getContractMenuStatusLabel(cm.status, cm.productionType),
        cm.fileCount > 0 ? `資料${cm.fileCount}件` : "未提出",
      ])
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">広告管理</h1>
        <p className="text-muted-foreground">
          {selectedYear?.name ?? ""}
          年度・契約済みの協賛メニューの制作・提出状況を横断管理
        </p>
      </div>
      <PastYearNotice year={selectedYear} />

      <ErrorBanner
        message={
          (invalidYearSelection ? "指定された年度が見つかりません。" : null) ||
          yearError ||
          error ||
          (activeYearId
            ? sponsorshipMenusCache.error(activeYearId) ||
              contractMenusCache.error(activeYearId)
            : null)
        }
      />

      <div className="flex flex-col gap-3 rounded-md border bg-background p-3">
        <div className="flex items-start gap-2">
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
          <Button
            variant="outline"
            onClick={handleCsvExport}
            disabled={visibleContractMenus.length === 0}
          >
            CSVを出力
          </Button>
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
                {productionDepartmentFilter
                  ? `委員（${CONTRACT_MENU_PRODUCTION_DEPARTMENT_LABEL[productionDepartmentFilter]}）`
                  : CONTRACT_MENU_PRODUCTION_TYPE_LABEL[productionTypeFilter]}
              </Badge>
            )}
            {statusFilter !== ALL && (
              <Badge variant="secondary">
                ステータス: {statusFilterLabel(statusFilter)}
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
                  <ColumnFilterOption
                    selected={menuFilter === ALL}
                    onSelect={() => setMenuFilter(ALL)}
                  >
                    すべて
                  </ColumnFilterOption>
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
                  active={
                    productionTypeFilter !== ALL ||
                    productionDepartmentFilter !== null
                  }
                  open={openColumnFilter === "productionType"}
                  onToggle={() => toggleColumnFilter("productionType")}
                  onClose={() => {
                    setOpenColumnFilter(null)
                    setShowProductionDepartments(false)
                  }}
                >
                  <ColumnFilterOption
                    selected={
                      productionTypeFilter === ALL &&
                      productionDepartmentFilter === null
                    }
                    onSelect={() => {
                      setProductionTypeFilter(ALL)
                      setProductionDepartmentFilter(null)
                      setShowProductionDepartments(false)
                    }}
                  >
                    すべて
                  </ColumnFilterOption>
                  {(["COMPANY", "INTERNAL", "CONTINUED"] as const).map(
                    (value) => (
                      <div
                        key={value}
                        onMouseEnter={() =>
                          setShowProductionDepartments(value === "INTERNAL")
                        }
                        onMouseLeave={() => setShowProductionDepartments(false)}
                        onFocusCapture={() =>
                          setShowProductionDepartments(value === "INTERNAL")
                        }
                      >
                        <ColumnFilterOption
                          selected={
                            productionTypeFilter === value &&
                            (value !== "INTERNAL" ||
                              productionDepartmentFilter === null)
                          }
                          onSelect={() => {
                            setProductionTypeFilter((current) =>
                              current === value &&
                              productionDepartmentFilter === null
                                ? ALL
                                : value
                            )
                            setProductionDepartmentFilter(null)
                          }}
                        >
                          {CONTRACT_MENU_PRODUCTION_TYPE_LABEL[value]}
                        </ColumnFilterOption>
                        {value === "INTERNAL" && showProductionDepartments && (
                          <div className="ml-3 flex flex-col gap-0.5 border-l pl-1">
                            {Object.entries(
                              CONTRACT_MENU_PRODUCTION_DEPARTMENT_LABEL
                            ).map(([department, departmentLabel]) => (
                              <ColumnFilterOption
                                key={department}
                                selected={
                                  productionDepartmentFilter === department
                                }
                                onSelect={() => {
                                  setProductionTypeFilter("INTERNAL")
                                  setProductionDepartmentFilter(
                                    department as ContractMenuProductionDepartment
                                  )
                                }}
                              >
                                {departmentLabel}
                              </ColumnFilterOption>
                            ))}
                          </div>
                        )}
                      </div>
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
                  <ColumnFilterOption
                    selected={statusFilter === ALL}
                    onSelect={() => setStatusFilter(ALL)}
                  >
                    すべて
                  </ColumnFilterOption>
                  {AD_MANAGEMENT_STATUS_FILTERS.map((option) => (
                    <ColumnFilterOption
                      key={option.value}
                      selected={statusFilter === option.value}
                      onSelect={() =>
                        setStatusFilter((current) =>
                          current === option.value ? ALL : option.value
                        )
                      }
                    >
                      {option.label}
                    </ColumnFilterOption>
                  ))}
                </ColumnFilterPopover>
              </TableHead>
              <TableHead>
                資料(Google Drive)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || catalogLoading ? (
              <LoadingRow colSpan={7} />
            ) : invalidYearSelection ? (
              <EmptyRow colSpan={7} message="指定された年度が見つかりません。" />
            ) : !activeYearId ? (
              <EmptyRow
                colSpan={7}
                message="年度が未作成です。年度画面から作成してください。"
              />
            ) : visibleContractMenus.length === 0 ? (
              <EmptyRow colSpan={7} message="該当する契約メニューがありません。" />
            ) : (
              visibleContractMenus.map((cm) => {
                const statusEditable =
                  canManageStatus && (cm.allowStatusChange ?? true)
                return (
                  <TableRow key={cm.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/yearly-companies/${cm.yearlyCompanyId}?yearId=${encodeURIComponent(activeYearId ?? "")}`}
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
                      {isPastYear ? (
                        cm.quantity
                      ) : (
                        <EditableQuantityCell
                          value={cm.quantity}
                          disabled={savingId === cm.id || !canManage}
                          onChange={(quantity) =>
                            void handleDetailsChange(cm.id, { quantity })
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <EditableProductionDepartmentCell
                        productionType={cm.productionType}
                        value={cm.productionDepartment}
                        disabled={
                          isPastYear || savingId === cm.id || !canManageStatus
                        }
                        onChange={(productionDepartment) =>
                          void handleProductionDepartmentChange(
                            cm.id,
                            productionDepartment
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {cm.productionType === null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : isPastYear ? (
                        getContractMenuStatusLabel(cm.status, cm.productionType)
                      ) : (
                        <EditableContractMenuStatusBadge
                          value={cm.status}
                          productionType={cm.productionType}
                          onChange={(status) =>
                            void handleStatusChange(cm.id, status)
                          }
                          disabled={savingId === cm.id || !statusEditable}
                          availableStatuses={MANUALLY_SELECTABLE_STATUSES}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <ContractMenuFilesSummary
                        menu={cm}
                        onReviewComplete={(result) => {
                          if (!activeYearId) return
                          contractMenusCache.set(
                            activeYearId,
                            contractMenus.map((menu) =>
                              menu.id === cm.id
                                ? {
                                    ...menu,
                                    status: result.status,
                                    reviewIndicator: "REVIEWED",
                                    currentSubmission: menu.currentSubmission
                                      ? {
                                          ...menu.currentSubmission,
                                          reviewStatus:
                                            result.status === "WAITING"
                                              ? "CHANGES_REQUESTED"
                                              : "APPROVED",
                                        }
                                      : null,
                                  }
                                : menu
                            )
                          )
                        }}
                      />
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
