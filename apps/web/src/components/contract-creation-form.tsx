"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  ContractMenuItemFields,
  type ContractMenuItemValue,
} from "@/components/contract-menu-item-fields"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

export type ContractCreationInput = {
  contractDate: string
  remarks: string
  items: ContractMenuItemValue[]
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
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

/**
 * Inline Contract creation on Yearly Company Detail
 * (spec/frontend.md#Yearly Company Detail → Contract Menu). Expands in place
 * from the Contract Menu block — the Contract Menu table is both the creation
 * point and the ongoing edit point, so there is no page navigation.
 *
 * `onCreate` resolves false when the API rejected the submission, which keeps
 * the form open so the entered lines are not lost.
 */
export function ContractCreationForm({
  menus,
  busy,
  onCreate,
}: {
  menus: SponsorshipMenu[]
  busy: boolean
  onCreate: (input: ContractCreationInput) => Promise<boolean>
}) {
  const [creating, setCreating] = useState(false)
  const [contractDate, setContractDate] = useState(formatDate(new Date()))
  const [remarks, setRemarks] = useState("")
  const [items, setItems] = useState<ContractMenuItemValue[]>([])
  const [contractDateError, setContractDateError] = useState<string | null>(
    null
  )
  const [itemsError, setItemsError] = useState<string | null>(null)

  const previewTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  if (!creating) {
    return (
      <div className="rounded-md border border-dashed p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          まだ契約がありません。合意後にここで作成します（入金レコードはメニュー確定後に別途作成）。
        </p>
        <Button
          onClick={() => {
            setItems([emptyItem(menus)])
            setCreating(true)
          }}
        >
          契約を作成
        </Button>
      </div>
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setContractDateError(null)
    setItemsError(null)

    let hasFieldError = false
    if (!contractDate) {
      setContractDateError("契約日を入力してください")
      hasFieldError = true
    }
    const selectedItems = items.filter((item) => item.sponsorshipMenuId)
    if (selectedItems.length === 0) {
      setItemsError("協賛メニューを1件以上選択してください")
      hasFieldError = true
    }
    if (hasFieldError) return

    const created = await onCreate({
      contractDate,
      remarks,
      items: selectedItems,
    })
    if (created) setCreating(false)
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-4 rounded-md border p-4"
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={!!contractDateError}>
          <FieldLabel>契約日</FieldLabel>
          <Input
            type="date"
            value={contractDate}
            onChange={(e) => {
              setContractDate(e.target.value)
              setContractDateError(null)
            }}
            aria-invalid={!!contractDateError}
          />
          {contractDateError && <FieldError>{contractDateError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel>備考</FieldLabel>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">協賛メニュー</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setItems((prev) => [...prev, emptyItem(menus)])
              setItemsError(null)
            }}
          >
            行を追加
          </Button>
        </div>
        {items.map((item, index) => (
          <ContractMenuItemFields
            key={index}
            value={item}
            menus={menus}
            invalid={!!itemsError && !item.sponsorshipMenuId}
            onChange={(patch) => {
              setItems((prev) =>
                prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
              )
              setItemsError(null)
            }}
            onRemove={
              items.length > 1
                ? () => setItems((prev) => prev.filter((_, i) => i !== index))
                : undefined
            }
          />
        ))}
        {itemsError && <FieldError>{itemsError}</FieldError>}
        <p className="text-right text-sm text-muted-foreground">
          合計（表示専用・サーバー再計算）: ¥{previewTotal.toLocaleString("ja-JP")}
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          作成する
        </Button>
        <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
