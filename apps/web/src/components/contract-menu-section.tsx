"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { EditableProductionTypeCell } from "@/components/editable-production-type-cell"
import { EditableQuantityCell } from "@/components/editable-quantity-cell"
import { useCurrentUser } from "@/components/current-user-provider"
import { ErrorBanner } from "@/components/query-state"
import {
  addContractMenuToContract,
  deleteContractMenu,
  updateContractMenu,
} from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"
import { DriveUploadDialog } from "@/components/drive-upload-dialog"
import type {
  ContractMenu,
  ContractMenuProductionType,
} from "@/types/contract-menu"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

const ALLOWED_ROLES = ["SPONSORSHIP_MEMBER", "ADMINISTRATOR"]
/** Deletion is Administrator-only system-wide (spec/api.md#Authorization Matrix). */
const DELETE_ROLES = ["ADMINISTRATOR"]

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

function recalcTotal(menus: ContractMenu[]): number {
  return menus.reduce((sum, cm) => sum + cm.quantity * cm.unitPrice, 0)
}

/**
 * Contract Menu table + total amount + "メニューを追加"
 * (spec/usecase.md UC-07 / spec/frontend.md#Yearly Company Detail).
 * Lines are editable in place (quantity, production type). Deleting a line is
 * Administrator-only and hidden for every other Role, matching the backend's
 * `RequireRoles("ADMINISTRATOR")` on `DELETE /contract-menus/{id}`.
 * `isGoodsSponsorship` is chosen only when adding a menu
 * (`ContractMenuItemFields`) and shown as a badge when true.
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
  /** Called after add/edit so the parent can sync contract total without a full-page reload. */
  onChanged?: (next: {
    contractMenus: ContractMenu[]
    totalAmount: number
  }) => void
}) {
  const { currentUser } = useCurrentUser()
  const canManage = canAccess(currentUser?.roles, ALLOWED_ROLES)
  const canDelete = canAccess(currentUser?.roles, DELETE_ROLES)
  const [contractMenus, setContractMenus] = useState(initialContractMenus)
  const [totalAmount, setTotalAmount] = useState(initialTotalAmount)
  const [open, setOpen] = useState(false)
  const [newItem, setNewItem] = useState<ContractMenuItemValue>(
    emptyItem(menus)
  )
  const [busy, setBusy] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [uploadingMenuId, setUploadingMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContractMenu | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyMenus(nextContractMenus: ContractMenu[]) {
    const nextTotal = recalcTotal(nextContractMenus)
    setContractMenus(nextContractMenus)
    setTotalAmount(nextTotal)
    onChanged?.({ contractMenus: nextContractMenus, totalAmount: nextTotal })
  }

  async function handlePatch(
    id: string,
    patch: {
      quantity?: number
      productionType?: ContractMenuProductionType | null
    }
  ) {
    setSavingId(id)
    setError(null)
    try {
      const updated = await updateContractMenu(id, patch)
      applyMenus(
        contractMenus.map((cm) => (cm.id === updated.id ? updated : cm))
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

  async function handleDelete(target: ContractMenu) {
    setDeleting(true)
    setError(null)
    try {
      await deleteContractMenu(target.id)
      applyMenus(contractMenus.filter((cm) => cm.id !== target.id))
      setDeleteTarget(null)
    } catch (e) {
      setError(
        getErrorMessage(e, {
          fallback: "メニューの削除に失敗しました",
          overrides: {
            CONFLICT: "入金確定済みのため、金額が変わる削除はできません。",
            FORBIDDEN: "削除は管理者のみが実行できます。",
          },
        })
      )
    } finally {
      setDeleting(false)
    }
  }

  async function handleAdd() {
    if (!newItem.sponsorshipMenuId) return
    setBusy(true)
    setError(null)
    try {
      const created = await addContractMenuToContract(contractId, newItem)
      applyMenus([...contractMenus, created])
      setNewItem(emptyItem(menus))
      setOpen(false)
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "メニューの追加に失敗しました" }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-medium">協賛メニュー</h2>
        {canManage && (
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
              <ErrorBanner message={error} />
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
        )}
      </div>

      {!open && !deleteTarget && <ErrorBanner message={error} />}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メニュー</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>単価</TableHead>
              <TableHead>小計</TableHead>
              <TableHead>制作者</TableHead>
              <TableHead>資料(GoogleDrive)</TableHead>
              {canDelete && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractMenus.map((cm) => {
              const menu = menus.find((m) => m.id === cm.sponsorshipMenuId)
              const rowBusy = savingId === cm.id
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
                  <TableCell>
                    <EditableQuantityCell
                      value={cm.quantity}
                      disabled={!canManage || rowBusy}
                      onChange={(quantity) =>
                        void handlePatch(cm.id, { quantity })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {currencyFormatter.format(cm.unitPrice)}
                  </TableCell>
                  <TableCell>
                    {currencyFormatter.format(cm.quantity * cm.unitPrice)}
                  </TableCell>
                  <TableCell>
                    <EditableProductionTypeCell
                      value={cm.productionType}
                      disabled={!canManage || rowBusy}
                      onChange={(productionType) =>
                        void handlePatch(cm.id, { productionType })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {cm.driveUrl ? (
                        <a
                          href={cm.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {cm.driveFileName || "確認"}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUploadingMenuId(cm.id)}
                        >
                          {cm.driveUrl ? "再アップロード" : "アップロード"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${menu?.name ?? "メニュー"}を削除`}
                        title="削除"
                        disabled={rowBusy}
                        onClick={() => {
                          setError(null)
                          setDeleteTarget(cm)
                        }}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {deleteTarget && (
          <Dialog
            open
            onOpenChange={(next) => {
              if (!next && !deleting) setDeleteTarget(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>メニューを削除しますか？</DialogTitle>
                <DialogDescription>
                  {menus.find((m) => m.id === deleteTarget.sponsorshipMenuId)
                    ?.name ?? "(不明なメニュー)"}{" "}
                  を削除します。この操作は取り消せず、合計金額が再計算されます。
                </DialogDescription>
              </DialogHeader>
              <ErrorBanner message={error} />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleDelete(deleteTarget)}
                  disabled={deleting}
                >
                  {deleting ? "削除中..." : "削除"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {uploadingMenuId && (
          <DriveUploadDialog
            menuId={uploadingMenuId}
            open={!!uploadingMenuId}
            onOpenChange={(open) => !open && setUploadingMenuId(null)}
            onSuccess={(updated) => {
              setUploadingMenuId(null)
              applyMenus(
                contractMenus.map((cm) =>
                  cm.id === updated.id ? updated : cm
                )
              )
            }}
          />
        )}
      </div>

      <div className="flex justify-end text-lg font-semibold">
        合計金額: {currencyFormatter.format(totalAmount)}
      </div>
    </>
  )
}
