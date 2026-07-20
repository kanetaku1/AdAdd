"use client"

import { useState } from "react"

import { useActiveYear } from "@/components/active-year-provider"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isApiEnabled } from "@/lib/api/client"
import { createYear } from "@/lib/data/years"

function emptyForm() {
  return { name: "", startDate: "", endDate: "" }
}

/**
 * Year List (spec/frontend.md#Year Management, UC-01). Creating a Year
 * bulk-generates a Yearly Company for every existing Company and makes it
 * the active Year in place of whichever one was active before.
 *
 * Connected to GET/POST /years (Issue #18) via the shared ActiveYearProvider
 * — `refresh()` re-fetches after a successful create so every screen that
 * reads the active Year re-scopes immediately.
 */
export default function YearsPage() {
  const { years, loading, error, refresh } = useActiveYear()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleCreate() {
    if (!form.name || !form.startDate || !form.endDate) return
    setCreating(true)
    setCreateError(null)
    try {
      await createYear(form)
      await refresh()
      setForm(emptyForm())
      setOpen(false)
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "年度の作成に失敗しました"
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Years</h1>
          <p className="text-muted-foreground">技大祭の年度管理</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) {
              setForm(emptyForm())
              setCreateError(null)
            }
          }}
        >
          <DialogTrigger render={<Button />}>新しい年度を作成</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい年度を作成</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="yearName">年度名</FieldLabel>
                <Input
                  id="yearName"
                  placeholder="2027"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="yearStartDate">開始日</FieldLabel>
                <Input
                  id="yearStartDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="yearEndDate">終了日</FieldLabel>
                <Input
                  id="yearEndDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </Field>
            </FieldGroup>
            <p className="text-xs text-muted-foreground">
              現在運用中の年度の企業情報を引き継いで Yearly Company
              を一括生成します。
            </p>
            {createError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {createError}
              </p>
            )}
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={
                  !form.name || !form.startDate || !form.endDate || creating
                }
              >
                {creating ? "作成中…" : "作成"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!isApiEnabled() && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          開発モード: mock データを使用（`NEXT_PUBLIC_API_BASE_URL` で API 接続）。
        </p>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>年度名</TableHead>
              <TableHead>開始日</TableHead>
              <TableHead>終了日</TableHead>
              <TableHead>状態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : years.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  年度がまだありません。「新しい年度を作成」から最初の年度を作成してください。
                </TableCell>
              </TableRow>
            ) : (
              years.map((year) => (
                <TableRow key={year.id}>
                  <TableCell className="font-medium">{year.name}</TableCell>
                  <TableCell>{year.startDate}</TableCell>
                  <TableCell>{year.endDate}</TableCell>
                  <TableCell>
                    {year.isActive && <Badge>運用中</Badge>}
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
