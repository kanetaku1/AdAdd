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
import { addContractMenuToContract } from "@/lib/data/sponsorship"
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import {
  CONTRACT_MENU_PRODUCTION_TYPE_LABEL,
  CONTRACT_MENU_STATUS_LABEL,
} from "@/lib/contract-menu-labels"
import type { ContractMenu } from "@/types/contract-menu"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

function emptyItem(): ContractMenuItemValue {
  const firstMenu = mockSponsorshipMenus[0]
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
  onChanged,
}: {
  contractId: string
  initialContractMenus: ContractMenu[]
  initialTotalAmount: number
  onChanged?: () => void
}) {
  const [contractMenus, setContractMenus] = useState(initialContractMenus)
  const [totalAmount, setTotalAmount] = useState(initialTotalAmount)
  const [open, setOpen] = useState(false)
  const [newItem, setNewItem] = useState<ContractMenuItemValue>(emptyItem())
  const [busy, setBusy] = useState(false)

  async function handleAdd() {
    if (!newItem.sponsorshipMenuId) return
    setBusy(true)
    try {
      const created = await addContractMenuToContract(contractId, newItem)
      const nextContractMenus = [...contractMenus, created]
      const nextTotal = nextContractMenus.reduce(
        (sum, cm) => sum + cm.quantity * cm.unitPrice,
        0
      )
      setContractMenus(nextContractMenus)
      setTotalAmount(nextTotal)
      setNewItem(emptyItem())
      setOpen(false)
      onChanged?.()
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
              onChange={(patch) =>
                setNewItem((prev) => ({ ...prev, ...patch }))
              }
            />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractMenus.map((cm) => {
              const menu = mockSponsorshipMenus.find(
                (m) => m.id === cm.sponsorshipMenuId
              )
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
