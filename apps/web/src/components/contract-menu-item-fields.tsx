"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CONTRACT_MENU_PRODUCTION_TYPE_LABEL } from "@/lib/contract-menu-labels"
import type { ContractMenuProductionType } from "@/types/contract-menu"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

export type ContractMenuItemValue = {
  sponsorshipMenuId: string
  quantity: number
  unitPrice: number
  isGoodsSponsorship: boolean
  productionType: ContractMenuProductionType | null
}

/**
 * Shared input group for one Contract Menu line item (spec/usecase.md
 * UC-06/UC-07) — used both for the repeated rows on the Sponsorship
 * Contract creation form and the single-row "add menu" modal on Contract
 * Detail, so the Sponsorship Menu / requiresSubmission conditional logic
 * only lives in one place.
 */
export function ContractMenuItemFields({
  value,
  menus,
  onChange,
  onRemove,
}: {
  value: ContractMenuItemValue
  menus: SponsorshipMenu[]
  onChange: (patch: Partial<ContractMenuItemValue>) => void
  onRemove?: () => void
}) {
  const menu = menus.find((m) => m.id === value.sponsorshipMenuId)

  function handleMenuChange(sponsorshipMenuId: string | null) {
    if (!sponsorshipMenuId) return
    const selected = menus.find((m) => m.id === sponsorshipMenuId)
    onChange({
      sponsorshipMenuId,
      unitPrice: selected?.defaultPrice ?? value.unitPrice,
      productionType: selected?.requiresSubmission
        ? value.productionType ?? "COMPANY"
        : null,
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <div className="flex min-w-48 flex-col gap-1">
        <label className="text-xs text-muted-foreground">メニュー</label>
        <Select
          value={value.sponsorshipMenuId}
          onValueChange={handleMenuChange}
          items={Object.fromEntries(
            menus.map((m) => [m.id, m.name])
          )}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="メニューを選択" />
          </SelectTrigger>
          <SelectContent>
            {menus.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-20 flex-col gap-1">
        <label className="text-xs text-muted-foreground">数量</label>
        <Input
          type="number"
          min={1}
          value={value.quantity}
          onChange={(e) =>
            onChange({ quantity: Number(e.target.value) || 1 })
          }
        />
      </div>

      <div className="flex w-28 flex-col gap-1">
        <label className="text-xs text-muted-foreground">単価</label>
        <Input
          type="number"
          min={0}
          value={value.unitPrice}
          onChange={(e) =>
            onChange({ unitPrice: Number(e.target.value) || 0 })
          }
        />
      </div>

      {menu?.requiresSubmission && (
        <div className="flex min-w-36 flex-col gap-1">
          <label className="text-xs text-muted-foreground">制作者</label>
          <Select
            value={value.productionType ?? "COMPANY"}
            onValueChange={(v) =>
              onChange({ productionType: v as ContractMenuProductionType })
            }
            items={CONTRACT_MENU_PRODUCTION_TYPE_LABEL}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONTRACT_MENU_PRODUCTION_TYPE_LABEL).map(
                ([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col items-center gap-1">
        <label className="text-xs text-muted-foreground">物品協賛</label>
        <Switch
          checked={value.isGoodsSponsorship}
          onCheckedChange={(checked) =>
            onChange({ isGoodsSponsorship: checked })
          }
        />
      </div>

      {onRemove && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          削除
        </Button>
      )}
    </div>
  )
}
