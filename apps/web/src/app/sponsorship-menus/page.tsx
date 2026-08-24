"use client"

import { useEffect, useRef, useState } from "react"

import { Plus } from "lucide-react"

import { useActiveYear } from "@/components/active-year-provider"
import { useCurrentUser } from "@/components/current-user-provider"
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
  listSponsorshipMenus,
  updateSponsorshipMenu,
} from "@/lib/data/sponsorship-menus"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

const ALLOWED_ROLES = ["SPONSORSHIP_MEMBER", "ADMINISTRATOR"]

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
  const [menus, setMenus] = useState<SponsorshipMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const menusRef = useRef(menus)
  menusRef.current = menus

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setMenus([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const list = await listSponsorshipMenus(yearId)
        if (!cancelled) setMenus(list)
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, { fallback: "読み込みに失敗しました" }))
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

  function updateLocalMenu(id: string, patch: Partial<SponsorshipMenu>) {
    setMenus((prev) =>
      prev.map((menu) => (menu.id === id ? { ...menu, ...patch } : menu))
    )
  }

  async function persistMenu(id: string, patch: Partial<SponsorshipMenu>) {
    const current = menusRef.current.find((menu) => menu.id === id)
    if (!current) return
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
      setMenus((prev) => prev.map((menu) => (menu.id === id ? updated : menu)))
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
      setMenus((prev) => [...prev, created])
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "追加に失敗しました" }))
    } finally {
      setAdding(false)
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

      <ErrorBanner message={yearError || error} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メニュー名</TableHead>
              <TableHead>標準価格</TableHead>
              <TableHead>上限数</TableHead>
              <TableHead>提出要否</TableHead>
              <TableHead>募集中</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading ? (
              <LoadingRow colSpan={5} />
            ) : !activeYearId ? (
              <EmptyRow
                colSpan={5}
                message="年度が未作成です。年度画面から作成してください。"
              />
            ) : menus.length === 0 ? (
              <EmptyRow colSpan={5} message="協賛メニューがまだありません。" />
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
