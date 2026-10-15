"use client"

import { useEffect, useState } from "react"

import { Plus, Trash2 } from "lucide-react"

import { useActiveYear } from "@/components/active-year-provider"
import { useCurrentUser } from "@/components/current-user-provider"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { useYearCatalog } from "@/components/year-catalog-provider"
import { IconActionButton } from "@/components/icon-action-button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import {
  createSponsorshipMenu,
  deleteSponsorshipMenu,
  updateSponsorshipMenu,
} from "@/lib/data/sponsorship-menus"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

const ALLOWED_ROLES = ["SPONSORSHIP_MEMBER", "ADMINISTRATOR"]
/** Deletion is Administrator-only system-wide (spec/api.md#Authorization Matrix). */
const DELETE_ROLES = ["ADMINISTRATOR"]

function parseMaxQuantity(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

/**
 * Sponsorship Menu master (spec/frontend.md#Sponsorship Menu Management).
 * Yearly master data (spec/domain.md Rule 10) — never belongs to a specific
 * Company or Contract. Every cell is directly editable (spec/frontend.md UI
 * Principle 4) since this master list is short and simple; "行を追加" adds a
 * new menu immediately (backend requires a non-empty name) that can then be
 * renamed and filled in over time. Active Year comes from the shared
 * ActiveYearProvider (Issue #18).
 *
 * Text/number fields update local state on every keystroke but only persist
 * on blur (Enter also blurs). Toggles persist immediately. PATCH replaces
 * the listed fields, so every persisted call sends the complete field set
 * — see lib/data/sponsorship-menus.ts.
 *
 * The per-row delete action is shown only to Administrator and confirmed
 * first; a menu already used by a Contract Menu is rejected (409).
 */
export default function SponsorshipMenusPage() {
  const {
    activeYear,
    loading: yearLoading,
    error: yearError,
  } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const { currentUser } = useCurrentUser()
  const canManage = canAccess(currentUser?.roles, ALLOWED_ROLES)
  const canDelete = canAccess(currentUser?.roles, DELETE_ROLES)
  const columnCount = canDelete ? 6 : 5
  const {
    sponsorshipMenus,
    isSponsorshipMenusLoading,
    sponsorshipMenusError,
    ensureSponsorshipMenus,
    setSponsorshipMenus,
  } = useYearCatalog()
  const menus = sponsorshipMenus(activeYearId)
  const loading = Boolean(
    activeYearId && isSponsorshipMenusLoading(activeYearId)
  )
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SponsorshipMenu | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeYearId) return
    void ensureSponsorshipMenus(activeYearId)
  }, [activeYearId, ensureSponsorshipMenus])

  function updateLocalMenu(id: string, patch: Partial<SponsorshipMenu>) {
    if (!activeYearId) return
    setSponsorshipMenus(
      activeYearId,
      menus.map((menu) => (menu.id === id ? { ...menu, ...patch } : menu))
    )
  }

  async function persistMenu(id: string, patch: Partial<SponsorshipMenu>) {
    const current = menus.find((menu) => menu.id === id)
    if (!current || !activeYearId) return
    const fields = { ...current, ...patch }
    setError(null)
    setSavingId(id)
    try {
      const updated = await updateSponsorshipMenu(id, {
        yearId: fields.yearId,
        name: fields.name,
        defaultPrice: fields.defaultPrice,
        requiresSubmission: fields.requiresSubmission,
        isActive: fields.isActive,
        maxQuantity: fields.maxQuantity,
      })
      setSponsorshipMenus(
        activeYearId,
        menus.map((menu) => (menu.id === id ? updated : menu))
      )
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "更新に失敗しました" }))
    } finally {
      setSavingId(null)
    }
  }

  function handleImmediateChange(id: string, patch: Partial<SponsorshipMenu>) {
    updateLocalMenu(id, patch)
    void persistMenu(id, patch)
  }

  async function addMenu() {
    if (!activeYearId) return
    setAdding(true)
    setError(null)
    try {
      const created = await createSponsorshipMenu(activeYearId, {
        name: "新規メニュー",
        defaultPrice: 0,
        requiresSubmission: false,
        isActive: true,
        maxQuantity: null,
      })
      setSponsorshipMenus(activeYearId, [...menus, created])
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "追加に失敗しました" }))
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(target: SponsorshipMenu) {
    if (!activeYearId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteSponsorshipMenu(target.id)
      setSponsorshipMenus(
        activeYearId,
        menus.filter((menu) => menu.id !== target.id)
      )
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(
        getErrorMessage(e, {
          fallback: "協賛メニューの削除に失敗しました",
          overrides: {
            CONFLICT:
              "契約で使われているメニューは削除できません。募集を止める場合は「募集中」をオフにしてください。",
            FORBIDDEN: "削除は管理者のみが実行できます。",
          },
        })
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">協賛メニュー</h1>
          <p className="text-muted-foreground">
            {activeYear?.name ?? ""}年度 協賛メニューマスタ
          </p>
        </div>
        {canManage && (
          <IconActionButton
            label={adding ? "追加中…" : "行を追加"}
            variant="default"
            onClick={() => void addMenu()}
            disabled={!activeYearId || adding}
          >
            <Plus />
          </IconActionButton>
        )}
      </div>

      <ErrorBanner
        message={
          yearError ||
          error ||
          (activeYearId ? sponsorshipMenusError(activeYearId) : null)
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メニュー名</TableHead>
              <TableHead>標準価格</TableHead>
              <TableHead>上限数</TableHead>
              <TableHead>提出要否</TableHead>
              <TableHead>募集中</TableHead>
              {canDelete && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading ? (
              <LoadingRow colSpan={columnCount} />
            ) : !activeYearId ? (
              <EmptyRow
                colSpan={columnCount}
                message="年度が未作成です。年度画面から作成してください。"
              />
            ) : menus.length === 0 ? (
              <EmptyRow
                colSpan={columnCount}
                message="協賛メニューがまだありません。"
              />
            ) : (
              menus.map((menu) => {
                const rowSaving = savingId === menu.id
                return (
                  <TableRow key={menu.id}>
                    <TableCell>
                      <Input
                        value={menu.name}
                        placeholder="メニュー名"
                        disabled={rowSaving || !canManage}
                        onChange={(e) =>
                          updateLocalMenu(menu.id, { name: e.target.value })
                        }
                        onBlur={(e) =>
                          void persistMenu(menu.id, { name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur()
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1000}
                        value={menu.defaultPrice}
                        disabled={rowSaving || !canManage}
                        onChange={(e) =>
                          updateLocalMenu(menu.id, {
                            defaultPrice: Number(e.target.value) || 0,
                          })
                        }
                        onBlur={(e) =>
                          void persistMenu(menu.id, {
                            defaultPrice: Number(e.target.value) || 0,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur()
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder="なし"
                        aria-label={`${menu.name}の上限数`}
                        value={menu.maxQuantity ?? ""}
                        disabled={rowSaving || !canManage}
                        onChange={(e) =>
                          updateLocalMenu(menu.id, {
                            maxQuantity: parseMaxQuantity(e.target.value),
                          })
                        }
                        onBlur={(e) => {
                          const maxQuantity = parseMaxQuantity(e.target.value)
                          updateLocalMenu(menu.id, { maxQuantity })
                          void persistMenu(menu.id, { maxQuantity })
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur()
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={menu.requiresSubmission}
                        disabled={rowSaving || !canManage}
                        onCheckedChange={(checked) =>
                          handleImmediateChange(menu.id, {
                            requiresSubmission: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={menu.isActive}
                        disabled={rowSaving || !canManage}
                        onCheckedChange={(checked) =>
                          handleImmediateChange(menu.id, { isActive: checked })
                        }
                      />
                    </TableCell>
                    {canDelete && (
                      <TableCell>
                        <IconActionButton
                          label={`${menu.name}を削除`}
                          disabled={rowSaving}
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteTarget(menu)
                          }}
                        >
                          <Trash2 className="text-destructive" />
                        </IconActionButton>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {deleteTarget && (
        <DeleteConfirmDialog
          title="協賛メニューを削除しますか？"
          description={`${deleteTarget.name} を削除します。この操作は取り消せません。`}
          error={deleteError}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete(deleteTarget)}
        />
      )}
    </div>
  )
}
