"use client"

import { useEffect, useState } from "react"

import { useActiveYear } from "@/components/active-year-provider"
import { Button } from "@/components/ui/button"
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
import {
  createSponsorshipMenu,
  listSponsorshipMenus,
  updateSponsorshipMenu,
} from "@/lib/data/sponsorship-menus"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

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
 * on blur; toggles persist immediately. The backend's PATCH `Save`s the full
 * row (no fetch-then-merge), so every persisted call sends the complete
 * field set — see lib/data/sponsorship-menus.ts.
 */
export default function SponsorshipMenusPage() {
  const {
    activeYear,
    loading: yearLoading,
    error: yearError,
  } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const [menus, setMenus] = useState<SponsorshipMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

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
          setError(e instanceof Error ? e.message : "読み込みに失敗しました")
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
    const current = menus.find((menu) => menu.id === id)
    if (!current) return
    const fields = { ...current, ...patch }
    setError(null)
    try {
      const updated = await updateSponsorshipMenu(id, {
        yearId: fields.yearId,
        name: fields.name,
        defaultPrice: fields.defaultPrice,
        requiresSubmission: fields.requiresSubmission,
        isActive: fields.isActive,
      })
      setMenus((prev) => prev.map((menu) => (menu.id === id ? updated : menu)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました")
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
      })
      setMenus((prev) => [...prev, created])
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sponsorship Menus</h1>
          <p className="text-muted-foreground">
            {activeYear?.name ?? ""}年度 協賛メニューマスタ
          </p>
        </div>
        <Button onClick={() => void addMenu()} disabled={!activeYearId || adding}>
          {adding ? "追加中…" : "行を追加"}
        </Button>
      </div>

      {(yearError || error) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {yearError || error}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メニュー名</TableHead>
              <TableHead>標準価格</TableHead>
              <TableHead>提出要否</TableHead>
              <TableHead>募集中</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : !activeYearId ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  年度が未作成です。Years から年度を作成してください。
                </TableCell>
              </TableRow>
            ) : (
              menus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell>
                    <Input
                      value={menu.name}
                      placeholder="メニュー名"
                      onChange={(e) =>
                        updateLocalMenu(menu.id, { name: e.target.value })
                      }
                      onBlur={(e) =>
                        void persistMenu(menu.id, { name: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      value={menu.defaultPrice}
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
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={menu.requiresSubmission}
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
                      onCheckedChange={(checked) =>
                        handleImmediateChange(menu.id, { isActive: checked })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
