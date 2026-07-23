"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ContractMenuItemFields,
  type ContractMenuItemValue,
} from "@/components/contract-menu-item-fields"
import {
  addContractMenuToContract,
  deleteContractMenu,
} from "@/lib/data/sponsorship"
import {
  CONTRACT_MENU_PRODUCTION_TYPE_LABEL,
  CONTRACT_MENU_STATUS_LABEL,
} from "@/lib/contract-menu-labels"
import type { ContractMenu } from "@/types/contract-menu"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

function emptyItem(menus: SponsorshipMenu[]): ContractMenuItemValue {
  const firstMenu = menus[0]
  return {
    sponsorshipMenuId: firstMenu?.id ?? "",
    quantity: 1,
    unitPrice: firstMenu?.defaultPrice ?? 0,
    isGoodsSponsorship: false,
    productionType: firstMenu?.requiresSubmission ? "COMPANY" : null,
  }
}

/**
 * Contract Menu table + total amount + "メニューを追加"
 * (spec/usecase.md UC-07 / spec/frontend.md#Yearly Company Detail).
 */
export function ContractMenuSection({
  contractId,
  initialContractMenus,
  initialTotalAmount,
  menus,
  onChanged,
}: {
  contractId: string
  initialContractMenus: ContractMenu[]
  initialTotalAmount: number
  menus: SponsorshipMenu[]
  onChanged?: () => void
}) {
  const [contractMenus, setContractMenus] = useState(initialContractMenus)
  const [totalAmount, setTotalAmount] = useState(initialTotalAmount)
  const [open, setOpen] = useState(false)
  const [newItem, setNewItem] = useState<ContractMenuItemValue>(
    emptyItem(menus)
  )
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!window.confirm("このメニューを削除しますか？")) return
    setDeletingId(id)
    setError(null)
    try {
      await deleteContractMenu(id)
      const nextContractMenus = contractMenus.filter((cm) => cm.id !== id)
      const nextTotal = nextContractMenus.reduce(
        (sum, cm) => sum + cm.quantity * cm.unitPrice,
        0
      )
      setContractMenus(nextContractMenus)
      setTotalAmount(nextTotal)
      onChanged?.()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "メニューの削除に失敗しました"
      )
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAdd() {
    if (!newItem.sponsorshipMenuId) return
    setBusy(true)
    setError(null)
    try {
      const created = await addContractMenuToContract(contractId, newItem)
      const nextContractMenus = [...contractMenus, created]
      const nextTotal = nextContractMenus.reduce(
        (sum, cm) => sum + cm.quantity * cm.unitPrice,
        0
      )
      setContractMenus(nextContractMenus)
      setTotalAmount(nextTotal)
      setNewItem(emptyItem(menus))
      setOpen(false)
      onChanged?.()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "メニューの追加に失敗しました"
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-medium">協賛メニュー</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            メニューを追加
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>メニューを追加</DialogTitle>
            </DialogHeader>
            <ContractMenuItemFields
              value={newItem}
              menus={menus}
              onChange={(patch) =>
                setNewItem((prev) => ({ ...prev, ...patch }))
              }
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <DialogFooter>
              <Button
                onClick={() => void handleAdd()}
                disabled={!newItem.sponsorshipMenuId || busy}
              >
                追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && !open && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メニュー</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>単価</TableHead>
              <TableHead>小計</TableHead>
              <TableHead>制作者</TableHead>
              <TableHead>進捗</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractMenus.map((cm) => {
              const menu = menus.find((m) => m.id === cm.sponsorshipMenuId)
              return (
                <TableRow key={cm.id}>
                  <TableCell className="font-medium">
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
                    {currencyFormatter.format(cm.quantity * cm.unitPrice)}
                  </TableCell>
                  <TableCell>
                    {cm.productionType
                      ? CONTRACT_MENU_PRODUCTION_TYPE_LABEL[cm.productionType]
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CONTRACT_MENU_STATUS_LABEL[cm.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(cm.id)}
                      disabled={deletingId === cm.id}
                    >
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end text-lg font-semibold">
        合計金額: {currencyFormatter.format(totalAmount)}
      </div>
    </>
  )
}
