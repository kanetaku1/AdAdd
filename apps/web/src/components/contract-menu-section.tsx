"use client"

import { useState } from "react"
import { Plus, Trash2, Upload, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  IconActionButton,
  IconActionDialogTrigger,
} from "@/components/icon-action-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  deleteContractMenuFile,
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

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

async function requestDriveToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not configured")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = (window as any).gapi?.client?.getToken()?.access_token
  if (existing) return existing

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let script = document.querySelector(`script[src="https://accounts.google.com/gsi/client"]`) as HTMLScriptElement | null

    const initAuth = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "https://www.googleapis.com/auth/drive.file",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (response: any) => {
            if (response.error !== undefined) {
              reject(new Error(response.error))
              return
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).gapi && (window as any).gapi.client) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).gapi.client.setToken({ access_token: response.access_token })
            }
            resolve(response.access_token)
          },
        })
        client.requestAccessToken()
      } catch (err) {
        reject(err)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (script && (window as any).google?.accounts?.oauth2) {
      initAuth()
      return
    }

    if (!script) {
      script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }

    script.addEventListener("load", initAuth)
    script.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")))
  })
}

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
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  async function handleDeleteFile(menuId: string, fileId: string) {
    if (!confirm("AdAddの履歴と、Google Driveのファイル本体の両方を削除しますか？\n（Google Driveへのアクセスのため、初回のみ認証画面が開く場合があります）")) return

    setError(null)
    setBusyIds((prev) => new Set([...prev, menuId]))
    try {
      const accessToken = await requestDriveToken()
      await deleteContractMenuFile(menuId, fileId, accessToken)
      applyMenus(
        contractMenus.map((cm) =>
          cm.id === menuId
            ? { ...cm, files: (cm.files ?? []).filter((f) => f.id !== fileId) }
            : cm
        )
      )
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "ファイルの削除に失敗しました" }))
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(menuId)
        return next
      })
    }
  }

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
            <IconActionDialogTrigger label="メニューを追加">
              <Plus />
            </IconActionDialogTrigger>
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
                      {cm.files && cm.files.length > 0 ? (
                        <div className="flex gap-1 items-center flex-wrap">
                          {cm.files.map((file, idx) => (
                            <Badge key={idx} variant="outline" className="flex items-center gap-1 group whitespace-nowrap bg-green-50 text-green-700 border-green-200" title={file.driveFileName}>
                              <a
                                href={file.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                素材{idx + 1}
                              </a>
                              {canManage && (
                                <button
                                  onClick={() => handleDeleteFile(cm.id, file.id)}
                                  className="text-muted-foreground hover:text-destructive opacity-50 hover:opacity-100 transition-opacity"
                                  title="ファイルを削除"
                                  disabled={busyIds.has(cm.id) || rowBusy}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                      {canManage && (
                        <IconActionButton
                          label={cm.files && cm.files.length > 0 ? "アップロード（追加）" : "アップロード"}
                          variant="outline"
                          onClick={() => setUploadingMenuId(cm.id)}
                        >
                          <Upload />
                        </IconActionButton>
                      )}
                    </div>
                  </TableCell>
                  {canDelete && (
                    <TableCell>
                      <IconActionButton
                        label={`${menu?.name ?? "メニュー"}を削除`}
                        disabled={rowBusy}
                        onClick={() => {
                          setError(null)
                          setDeleteTarget(cm)
                        }}
                      >
                        <Trash2 className="text-destructive" />
                      </IconActionButton>
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
