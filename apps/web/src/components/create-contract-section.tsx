"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  ContractMenuItemFields,
  type ContractMenuItemValue,
} from "@/components/contract-menu-item-fields"
import { addContractMenu } from "@/lib/mock/contract-menus"
import { addPayment } from "@/lib/mock/payments"
import { addSponsorshipContract } from "@/lib/mock/sponsorship-contracts"
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import { updateProgress } from "@/lib/mock/yearly-companies"
import type { ContractMenu } from "@/types/contract-menu"
import type { Payment } from "@/types/payment"
import type { SponsorshipContract } from "@/types/sponsorship-contract"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

function emptyItem(): ContractMenuItemValue {
  const firstMenu = mockSponsorshipMenus[0]
  return {
    sponsorshipMenuId: firstMenu?.id ?? "",
    quantity: 1,
    unitPrice: firstMenu?.defaultPrice ?? 0,
    isGoodsSponsorship: false,
    productionType: firstMenu?.requiresSubmission ? "COMPANY" : null,
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Inline Sponsorship Contract creation (spec/requirements.md FR-004,
 * spec/usecase.md UC-06/UC-07), shown on Yearly Company Detail in place of
 * the Contract section when none exists yet — no separate page, since the
 * Yearly Company is already known here (spec/model.md: 1:1).
 *
 * The assignee is not entered here — it is carried over from the Sponsorship
 * Member already assigned to the Yearly Company (UC-04), decided earlier by
 * the Company Management Team or an Advisor (spec/model.md#SponsorshipContract,
 * spec/usecase.md UC-06 Notes).
 *
 * Creating a contract also sets YearlyCompany.progress to Confirmed and,
 * when totalAmount > 0, creates a Payment (spec/domain.md#Sponsorship
 * Contract) — a goods-sponsorship-only contract gets no Payment.
 *
 * TODO: replace mock mutations with POST /yearly-companies/{id}/contract and
 * POST /contracts/{contractId}/menus once the backend exists (spec/api.md).
 */
export function CreateContractSection({
  yearlyCompanyId,
  assigneeName,
}: {
  yearlyCompanyId: string
  assigneeName: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [contractDate, setContractDate] = useState(formatDate(new Date()))
  const [remarks, setRemarks] = useState("")
  const [items, setItems] = useState<ContractMenuItemValue[]>([emptyItem()])

  function updateItem(index: number, patch: Partial<ContractMenuItemValue>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const contractId = crypto.randomUUID()
    const contract: SponsorshipContract = {
      id: contractId,
      yearlyCompanyId,
      contractDate,
      totalAmount,
      assigneeId: null,
      assigneeName,
      remarks,
    }
    addSponsorshipContract(contract)

    for (const item of items) {
      if (!item.sponsorshipMenuId) continue
      const contractMenu: ContractMenu = {
        id: crypto.randomUUID(),
        contractId,
        sponsorshipMenuId: item.sponsorshipMenuId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isGoodsSponsorship: item.isGoodsSponsorship,
        productionType: item.productionType,
        status: "WAITING",
        driveUrl: null,
        remarks: "",
      }
      addContractMenu(contractMenu)
    }

    if (totalAmount > 0) {
      const payment: Payment = {
        id: crypto.randomUUID(),
        contractId,
        amount: totalAmount,
        status: "WAITING",
        confirmedAt: null,
        confirmedById: null,
        confirmedByName: null,
      }
      addPayment(payment)
    }

    updateProgress(yearlyCompanyId, "CONFIRMED")
    router.refresh()
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-md border p-4 text-sm">
        <p className="text-muted-foreground">契約はまだありません</p>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          契約を作成
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-md border p-4"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="contractDate">契約日</FieldLabel>
          <Input
            id="contractDate"
            type="date"
            value={contractDate}
            onChange={(e) => setContractDate(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>担当者(委員会)</FieldLabel>
          <p className="text-sm">{assigneeName ?? "未割当"}</p>
        </Field>
        <Field>
          <FieldLabel htmlFor="remarks">備考</FieldLabel>
          <Textarea
            id="remarks"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">協賛メニュー</h3>
        {items.map((item, index) => (
          <ContractMenuItemFields
            key={index}
            value={item}
            onChange={(patch) => updateItem(index, patch)}
            onRemove={items.length > 1 ? () => removeItem(index) : undefined}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          行を追加
        </Button>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">合計金額</span>
        <span className="text-lg font-semibold">
          {currencyFormatter.format(totalAmount)}
        </span>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          キャンセル
        </Button>
        <Button type="submit">作成</Button>
      </div>
    </form>
  )
}
