"use client"

import { useState } from "react"

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
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

const CURRENT_YEAR_ID = "year_2026"

function emptyMenu(): SponsorshipMenu {
  return {
    id: crypto.randomUUID(),
    yearId: CURRENT_YEAR_ID,
    name: "",
    defaultPrice: 0,
    requiresSubmission: false,
    isActive: true,
  }
}

/**
 * Sponsorship Menu master (spec/frontend.md#Sponsorship Menu Management).
 * Yearly master data (spec/domain.md Rule 10) — never belongs to a specific
 * Company or Contract. Every cell is directly editable (spec/frontend.md UI
 * Principle 4) since this master list is short and simple; "行を追加" adds a
 * blank row that can be filled in over time.
 *
 * TODO: replace mockSponsorshipMenus with GET /years/{yearId}/sponsorship-menus,
 * and wire edits to POST/PATCH /years/{yearId}/sponsorship-menus once the
 * backend endpoints exist (spec/api.md).
 */
export default function SponsorshipMenusPage() {
  const [menus, setMenus] = useState<SponsorshipMenu[]>(mockSponsorshipMenus)

  function updateMenu(id: string, patch: Partial<SponsorshipMenu>) {
    setMenus((prev) =>
      prev.map((menu) => (menu.id === id ? { ...menu, ...patch } : menu))
    )
  }

  function addMenu() {
    setMenus((prev) => [...prev, emptyMenu()])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sponsorship Menus</h1>
          <p className="text-muted-foreground">2026年度 協賛メニューマスタ</p>
        </div>
        <Button onClick={addMenu}>行を追加</Button>
      </div>

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
            {menus.map((menu) => (
              <TableRow key={menu.id}>
                <TableCell>
                  <Input
                    value={menu.name}
                    placeholder="メニュー名"
                    onChange={(e) =>
                      updateMenu(menu.id, { name: e.target.value })
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
                      updateMenu(menu.id, {
                        defaultPrice: Number(e.target.value) || 0,
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={menu.requiresSubmission}
                    onCheckedChange={(checked) =>
                      updateMenu(menu.id, { requiresSubmission: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={menu.isActive}
                    onCheckedChange={(checked) =>
                      updateMenu(menu.id, { isActive: checked })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
