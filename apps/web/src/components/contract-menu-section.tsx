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
import { addContractMenu } from "@/lib/mock/contract-menus"
import { updateContractTotalAmount } from "@/lib/mock/sponsorship-contracts"
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
 * Contract Menu table + total amount + "メニューを追加" (spec/usecase.md
 * UC-07), extracted into a client component so contracts/[id]/page.tsx can
 * stay a server component while this part stays interactive — same pattern
 * as contract-progress-badge.tsx.
 */
export function ContractMenuSection({
  contractId,
  initialContractMenus,
  initialTotalAmount,
}: {
  contractId: string
  initialContractMenus: ContractMenu[]
  initialTotalAmount: number
}) {
  const [contractMenus, setContractMenus] = useState(initialContractMenus)
  const [totalAmount, setTotalAmount] = useState(initialTotalAmount)
  const [open, setOpen] = useState(false)
  const [newItem, setNewItem] = useState<ContractMenuItemValue>(emptyItem())

  function handleAdd() {
    if (!newItem.sponsorshipMenuId) return

    const contractMenu: ContractMenu = {
      id: crypto.randomUUID(),
      contractId,
      sponsorshipMenuId: newItem.sponsorshipMenuId,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      isGoodsSponsorship: newItem.isGoodsSponsorship,
      productionType: newItem.productionType,
      status: "WAITING",
      driveUrl: null,
      remarks: "",
    }
    addContractMenu(contractMenu)

    const nextContractMenus = [...contractMenus, contractMenu]
    const nextTotal = nextContractMenus.reduce(
      (sum, cm) => sum + cm.quantity * cm.unitPrice,
      0
    )
    updateContractTotalAmount(contractId, nextTotal)

    setContractMenus(nextContractMenus)
    setTotalAmount(nextTotal)
    setNewItem(emptyItem())
    setOpen(false)
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
              <Button onClick={handleAdd} disabled={!newItem.sponsorshipMenuId}>
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
