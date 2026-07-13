"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  ContractMenuItemFields,
  type ContractMenuItemValue,
} from "@/components/contract-menu-item-fields"
import {
  addSponsorshipContract,
  mockSponsorshipContracts,
} from "@/lib/mock/sponsorship-contracts"
import { addContractMenu } from "@/lib/mock/contract-menus"
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import type { ContractMenu } from "@/types/contract-menu"
import type { SponsorshipContract } from "@/types/sponsorship-contract"

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
 * Create Sponsorship Contract (spec/requirements.md FR-004, spec/usecase.md
 * UC-06/UC-07). Bundles registering the contract with adding its initial
 * Contract Menu line items in one form (also the entry point for goods
 * sponsorship — spec/domain.md#Contract Menu > Goods Sponsorship — which
 * must be entered manually, never via Google Forms).
 *
 * A Yearly Company has at most one contract (spec/model.md), so the picker
 * only offers Yearly Companies without one yet.
 *
 * The assignee is not entered here — it is carried over from the Sponsorship
 * Member already assigned to the Yearly Company (UC-04), decided earlier by
 * the Company Management Team or an Advisor (spec/model.md#SponsorshipContract,
 * spec/usecase.md UC-06 Notes).
 *
 * TODO: replace mock mutations with POST /yearly-companies/{id}/contract and
 * POST /contracts/{contractId}/menus once the backend exists (spec/api.md).
 */
export default function NewContractPage() {
  return (
    <Suspense fallback={null}>
      <NewContractForm />
    </Suspense>
  )
}

function NewContractForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedYearlyCompanyId = searchParams.get("yearlyCompanyId")

  const availableYearlyCompanies = mockYearlyCompanies.filter(
    (yc) => !mockSponsorshipContracts.some((c) => c.yearlyCompanyId === yc.id)
  )

  const [yearlyCompanyId, setYearlyCompanyId] = useState(
    preselectedYearlyCompanyId &&
      availableYearlyCompanies.some((yc) => yc.id === preselectedYearlyCompanyId)
      ? preselectedYearlyCompanyId
      : (availableYearlyCompanies[0]?.id ?? "")
  )
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

  const selectedYearlyCompany = availableYearlyCompanies.find(
    (yc) => yc.id === yearlyCompanyId
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!yearlyCompanyId) return

    const contractId = crypto.randomUUID()
    const contract: SponsorshipContract = {
      id: contractId,
      yearlyCompanyId,
      contractDate,
      totalAmount,
      assigneeId: null,
      assigneeName: selectedYearlyCompany?.assignedMemberName ?? null,
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

    router.push(`/contracts/${contractId}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">契約を作成</h1>
        <p className="text-muted-foreground">
          Sponsorship Contract の新規登録
        </p>
      </div>

      {availableYearlyCompanies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          契約可能な Yearly Company(まだ契約のない企業)がありません。
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="yearlyCompany">企業(Yearly Company)</FieldLabel>
              <Select
                value={yearlyCompanyId}
                onValueChange={(value) => setYearlyCompanyId(value ?? "")}
              >
                <SelectTrigger id="yearlyCompany">
                  <SelectValue placeholder="企業を選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableYearlyCompanies.map((yc) => (
                    <SelectItem key={yc.id} value={yc.id}>
                      {yc.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
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
              <p className="text-sm">
                {selectedYearlyCompany?.assignedMemberName ?? "未割当"}
              </p>
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
            <h2 className="font-medium">協賛メニュー</h2>
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

          <div className="flex items-center justify-between rounded-md border p-4">
            <span className="text-muted-foreground">合計金額</span>
            <span className="text-lg font-semibold">
              {new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
              }).format(totalAmount)}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" render={<a href="/yearly-companies" />}>
              キャンセル
            </Button>
            <Button type="submit" disabled={!yearlyCompanyId}>
              作成
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
