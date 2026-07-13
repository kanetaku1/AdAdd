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
import { addYear, mockYears } from "@/lib/mock/years"
import type { Year } from "@/types/year"

function emptyForm() {
  return { name: "", startDate: "", endDate: "" }
}

/**
 * Year List (spec/frontend.md#Year Management, UC-01). Creating a Year
 * bulk-generates a Yearly Company for every existing Company (see
 * addYear/registerCompanyToYear in mock/years.ts) and makes it the active
 * Year in place of whichever one was active before.
 *
 * TODO: replace mockYears with GET /years, and wire creation to POST /years
 * once the backend endpoints exist (spec/api.md).
 */
export default function YearsPage() {
  const [years, setYears] = useState<Year[]>(mockYears)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())

  function handleCreate() {
    if (!form.name || !form.startDate || !form.endDate) return
    addYear(form)
    setYears([...mockYears])
    setForm(emptyForm())
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Years</h1>
          <p className="text-muted-foreground">技大祭の年度管理</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
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
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!form.name || !form.startDate || !form.endDate}
              >
                作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
            {years.map((year) => (
              <TableRow key={year.id}>
                <TableCell className="font-medium">{year.name}</TableCell>
                <TableCell>{year.startDate}</TableCell>
                <TableCell>{year.endDate}</TableCell>
                <TableCell>
                  {year.isActive && <Badge>運用中</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
