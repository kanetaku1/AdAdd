"use client"

import { useState } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
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
import { mockContractMenus } from "@/lib/mock/contract-menus"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import {
  CONTRACT_MENU_PRODUCTION_TYPE_LABEL,
  CONTRACT_MENU_STATUS_LABEL,
} from "@/lib/contract-menu-labels"
import type {
  ContractMenu,
  ContractMenuProductionType,
  ContractMenuStatus,
} from "@/types/contract-menu"

const ALL = "ALL" as const

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

/**
 * Contract Menu List (spec/frontend.md#Contract Menu Management).
 * Cross-contract view of every contracted sponsorship item, for the
 * Sponsorship Menu Management Team to track production/submission status
 * across all companies at once (UC-07, UC-08) — not scoped to one Contract
 * like the table embedded in contracts/[id]/page.tsx.
 *
 * List-only with inline editing (status, production type, Drive URL),
 * matching the Sponsorship Menu / Payment screens rather than adding a
 * separate detail page.
 *
 * TODO: replace mock lookups with GET /contracts/{contractId}/menus (or a
 * future list-all-contract-menus endpoint) and wire edits to
 * PATCH /contract-menus/{id}/status and .../production once the backend
 * exists (spec/api.md).
 */
export default function ContractMenusPage() {
  const [contractMenus, setContractMenus] =
    useState<ContractMenu[]>(mockContractMenus)
  const [statusFilter, setStatusFilter] = useState<
    ContractMenuStatus | typeof ALL
  >(ALL)
  const [productionTypeFilter, setProductionTypeFilter] = useState<
    ContractMenuProductionType | typeof ALL
  >(ALL)

  function updateContractMenu(id: string, patch: Partial<ContractMenu>) {
    setContractMenus((prev) =>
      prev.map((cm) => (cm.id === id ? { ...cm, ...patch } : cm))
    )
  }

  const visibleContractMenus = contractMenus.filter(
    (cm) =>
      (statusFilter === ALL || cm.status === statusFilter) &&
      (productionTypeFilter === ALL ||
        cm.productionType === productionTypeFilter)
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Contract Menus</h1>
        <p className="text-muted-foreground">
          契約済みの協賛メニューの制作・提出状況を横断管理
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as ContractMenuStatus | typeof ALL)
          }
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
              <TableHead>Drive URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleContractMenus.map((cm) => {
              const contract = mockSponsorshipContracts.find(
                (c) => c.id === cm.contractId
              )
              const yearlyCompany = mockYearlyCompanies.find(
                (yc) => yc.id === contract?.yearlyCompanyId
              )
              const menu = mockSponsorshipMenus.find(
                (m) => m.id === cm.sponsorshipMenuId
              )
              return (
                <TableRow key={cm.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/contracts/${cm.contractId}`}
                      className="hover:underline"
                    >
                      {yearlyCompany?.companyName ?? "(不明な企業)"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {menu?.name ?? "(不明なメニュー)"}
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
                    {cm.productionType ? (
                      <Select
                        value={cm.productionType}
                        onValueChange={(value) =>
                          updateContractMenu(cm.id, {
                            productionType: value as ContractMenuProductionType,
                          })
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(
                            CONTRACT_MENU_PRODUCTION_TYPE_LABEL
                          ).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <EditableContractMenuStatusBadge
                      value={cm.status}
                      onChange={(status) =>
                        updateContractMenu(cm.id, { status })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={cm.driveUrl ?? ""}
                      placeholder="Drive URL"
                      onChange={(e) =>
                        updateContractMenu(cm.id, {
                          driveUrl: e.target.value || null,
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
