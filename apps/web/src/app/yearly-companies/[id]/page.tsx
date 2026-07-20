"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { AssignedMemberCell } from "@/components/assigned-member-cell"
import {
  ContractMenuItemFields,
  type ContractMenuItemValue,
} from "@/components/contract-menu-item-fields"
import { ContractMenuSection } from "@/components/contract-menu-section"
import { EditableProgressBadge } from "@/components/editable-progress-badge"
import { InvoiceGeneratorModal } from "@/components/invoice-generator-modal"
import { isApiEnabled } from "@/lib/api/client"
import {
  assignMember,
  createContractWithMenus,
  createPayment,
  getCompany,
  getContractByYearlyCompany,
  getPaymentByContract,
  getYearlyCompany,
  listContractMenus,
  listSponsorshipMenus,
  listUsers,
  updateYearlyCompanyProgress,
} from "@/lib/data/sponsorship"
import type { InvoiceData } from "@/lib/pdf/invoice-document"
import {
  PAYMENT_STATUS_BADGE_VARIANT,
  PAYMENT_STATUS_LABEL,
} from "@/lib/payment-labels"
import {
  COMPANY_STATUS_LABEL,
  SPONSORSHIP_PHASE_LABEL,
} from "@/lib/yearly-company-labels"
import type { Company } from "@/types/company"
import type { ContractMenu } from "@/types/contract-menu"
import type { Payment } from "@/types/payment"
import type { SponsorshipContract } from "@/types/sponsorship-contract"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"
import type { User } from "@/types/user"
import type {
  SponsorshipProgress,
  YearlyCompany,
} from "@/types/yearly-company"

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
 * Yearly Company Detail — main operation screen (spec/frontend.md#Yearly Company Detail).
 * Aggregates company info, assignment, contract, contract menus, progress, invoice, payment.
 */
export default function YearlyCompanyDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [yearlyCompany, setYearlyCompany] = useState<YearlyCompany | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [contract, setContract] = useState<SponsorshipContract | null>(null)
  const [contractMenus, setContractMenus] = useState<ContractMenu[]>([])
  const [payment, setPayment] = useState<Payment | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [menus, setMenus] = useState<SponsorshipMenu[]>([])
  const [creatingContract, setCreatingContract] = useState(false)
  const [contractDate, setContractDate] = useState(formatDate(new Date()))
  const [remarks, setRemarks] = useState("")
  const [items, setItems] = useState<ContractMenuItemValue[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Data fetch for route param — setState after async I/O is intentional. */
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const yc = await getYearlyCompany(id)
        if (cancelled) return
        if (!yc) {
          setYearlyCompany(null)
          return
        }
        setYearlyCompany(yc)
        const [co, ct, us, sm] = await Promise.all([
          getCompany(yc.companyId),
          getContractByYearlyCompany(yc.id),
          listUsers(),
          listSponsorshipMenus(yc.yearId),
        ])
        if (cancelled) return
        setCompany(co)
        setContract(ct)
        setUsers(us)
        setMenus(sm)
        if (ct) {
          const [cms, pay] = await Promise.all([
            listContractMenus(ct.id),
            getPaymentByContract(ct.id),
          ])
          if (cancelled) return
          setContractMenus(cms)
          setPayment(pay)
        } else {
          setContractMenus([])
          setPayment(null)
        }
      } catch (e) {
        if (!cancelled) {
          setYearlyCompany(null)
          setError(e instanceof Error ? e.message : "読み込みに失敗しました")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const yc = await getYearlyCompany(id)
      if (!yc) {
        setYearlyCompany(null)
        return
      }
      setYearlyCompany(yc)
      const [co, ct, us, sm] = await Promise.all([
        getCompany(yc.companyId),
        getContractByYearlyCompany(yc.id),
        listUsers(),
        listSponsorshipMenus(yc.yearId),
      ])
      setCompany(co)
      setContract(ct)
      setUsers(us)
      setMenus(sm)
      if (ct) {
        const [cms, pay] = await Promise.all([
          listContractMenus(ct.id),
          getPaymentByContract(ct.id),
        ])
        setContractMenus(cms)
        setPayment(pay)
      } else {
        setContractMenus([])
        setPayment(null)
      }
    } catch (e) {
      setYearlyCompany(null)
      setError(e instanceof Error ? e.message : "読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }, [id])

  const previewTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  )

  const invoiceData: InvoiceData | null = useMemo(() => {
    if (!yearlyCompany || !contract) return null
    const today = new Date()
    const deadline = new Date(today)
    deadline.setDate(deadline.getDate() + 14)
    return {
      companyName: yearlyCompany.companyName,
      contactPersonName: company?.contactPersonName ?? "",
      subject: "技大祭企業協賛",
      issuedDate: formatDate(today),
      deadline: formatDate(deadline),
      staffName: contract.assigneeName ?? yearlyCompany.assignedMemberName ?? "",
      remark: contract.remarks,
      items: contractMenus.map((cm) => ({
        name:
          menus.find((m) => m.id === cm.sponsorshipMenuId)?.name ??
          "(不明なメニュー)",
        quantity: cm.quantity,
        unitPrice: cm.unitPrice,
      })),
      totalAmount: contract.totalAmount,
    }
  }, [yearlyCompany, company, contract, contractMenus, menus])

  if (loading) {
    return <p className="text-muted-foreground">読み込み中…</p>
  }

  if (error && !yearlyCompany) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">読み込みエラー</h1>
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
        <Link href="/yearly-companies" className="text-sm hover:underline">
          Yearly Companies に戻る
        </Link>
      </div>
    )
  }

  if (!yearlyCompany) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">見つかりません</h1>
        <Link href="/yearly-companies" className="text-sm hover:underline">
          Yearly Companies に戻る
        </Link>
      </div>
    )
  }

  const yc = yearlyCompany

  async function handleAssign(userId: string | null) {
    setError(null)
    try {
      await assignMember(yc.id, userId)
      const name = users.find((u) => u.id === userId)?.name ?? null
      setYearlyCompany((prev) =>
        prev
          ? {
              ...prev,
              assignedMemberId: userId,
              assignedMemberName: name,
            }
          : prev
      )
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "担当メンバーの更新に失敗しました"
      )
    }
  }

  async function handleProgress(progress: SponsorshipProgress) {
    setError(null)
    try {
      await updateYearlyCompanyProgress(yc.id, progress)
      setYearlyCompany((prev) => (prev ? { ...prev, progress } : prev))
    } catch (e) {
      setError(e instanceof Error ? e.message : "進捗の更新に失敗しました")
    }
  }

  async function handleCreateContract(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createContractWithMenus(yc.id, {
        contractDate,
        remarks,
        items: items.filter((item) => item.sponsorshipMenuId),
      })
      setCreatingContract(false)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "契約の作成に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function handleCreatePayment() {
    if (!contract) return
    setBusy(true)
    setError(null)
    try {
      const created = await createPayment(contract.id)
      setPayment(created)
      await reload()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "入金レコードの作成に失敗しました"
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!isApiEnabled() && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          開発モード: `NEXT_PUBLIC_API_BASE_URL`
          未設定のため mock データを使用しています。認証は X-User-ID /
          X-User-Roles スタブです。
        </p>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/yearly-companies" className="hover:underline">
              Yearly Companies
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">{yearlyCompany.companyName}</h1>
          <p className="text-muted-foreground">
            {COMPANY_STATUS_LABEL[yearlyCompany.companyStatus]} ·{" "}
            {SPONSORSHIP_PHASE_LABEL[yearlyCompany.phase]}
          </p>
        </div>
        <EditableProgressBadge
          value={yearlyCompany.progress}
          onChange={(value) => void handleProgress(value)}
        />
      </div>

      <section className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="text-muted-foreground">企業担当者（先方）</div>
          <div>{company?.contactPersonName ?? "-"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">連絡先</div>
          <div className="break-all">{company?.contactEmailOrForm ?? "-"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">住所</div>
          <div>
            {company?.postalCode ? `〒${company.postalCode} ` : ""}
            {company?.address ?? "-"}
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="text-muted-foreground">メモ</div>
          <div>{yearlyCompany.notes || company?.memo || "-"}</div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">担当</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm text-muted-foreground">
              協賛実働メンバー
            </div>
            <AssignedMemberCell
              assignedMemberId={yearlyCompany.assignedMemberId}
              assignedMemberName={yearlyCompany.assignedMemberName}
              users={users}
              onChange={(userId) => void handleAssign(userId)}
            />
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm text-muted-foreground">
              協賛アドバイザー
            </div>
            <p className="text-sm text-muted-foreground">
              Advisor はメンバー単位の割当です。Users 画面から管理します。
            </p>
          </div>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">契約</h2>
          {contract && invoiceData && (
            <div className="flex flex-wrap items-center gap-2">
              <InvoiceGeneratorModal
                initialData={invoiceData}
                fileName={`請求書_${invoiceData.companyName}.pdf`}
              />
              {contract.totalAmount > 0 && !payment && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleCreatePayment()}
                >
                  入金レコードを作成
                </Button>
              )}
            </div>
          )}
        </div>

        {!contract && !creatingContract && (
          <div className="rounded-md border border-dashed p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              まだ契約がありません。合意後にここで作成します（Payment
              はメニュー確定後に別途作成）。
            </p>
            <Button
              onClick={() => {
                setItems([emptyItem(menus)])
                setCreatingContract(true)
              }}
            >
              契約を作成
            </Button>
          </div>
        )}

        {!contract && creatingContract && (
          <form
            onSubmit={(e) => void handleCreateContract(e)}
            className="flex flex-col gap-4 rounded-md border p-4"
          >
            <FieldGroup>
              <Field>
                <FieldLabel>契約日</FieldLabel>
                <Input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  required
                />
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
                <h3 className="text-sm font-medium">Contract Menu</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setItems((prev) => [...prev, emptyItem(menus)])
                  }
                >
                  行を追加
                </Button>
              </div>
              {items.map((item, index) => (
                <ContractMenuItemFields
                  key={index}
                  value={item}
                  onChange={(patch) =>
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, ...patch } : row
                      )
                    )
                  }
                  onRemove={
                    items.length > 1
                      ? () =>
                          setItems((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                      : undefined
                  }
                />
              ))}
              <p className="text-right text-sm text-muted-foreground">
                合計（表示専用・サーバ再計算）: ¥
                {previewTotal.toLocaleString("ja-JP")}
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                作成する
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreatingContract(false)}
              >
                キャンセル
              </Button>
            </div>
          </form>
        )}

        {contract && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-muted-foreground">契約日</div>
                <div>{contract.contractDate}</div>
              </div>
              <div>
                <div className="text-muted-foreground">担当者（委員会）</div>
                <div>
                  {contract.assigneeName ??
                    yearlyCompany.assignedMemberName ??
                    "未割当"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">入金状況</div>
                <div>
                  {payment ? (
                    <Badge
                      variant={PAYMENT_STATUS_BADGE_VARIANT[payment.status]}
                    >
                      {PAYMENT_STATUS_LABEL[payment.status]}
                    </Badge>
                  ) : contract.totalAmount > 0 ? (
                    "未作成"
                  ) : (
                    "物品協賛（入金なし）"
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">合計金額</div>
                <div>
                  {new Intl.NumberFormat("ja-JP", {
                    style: "currency",
                    currency: "JPY",
                  }).format(contract.totalAmount)}
                </div>
              </div>
            </div>

            <ContractMenuSection
              key={`${contract.id}-${contract.totalAmount}-${contractMenus.length}`}
              contractId={contract.id}
              initialContractMenus={contractMenus}
              initialTotalAmount={contract.totalAmount}
              onChanged={() => void reload()}
            />

            {contract.remarks && (
              <div className="text-sm">
                <div className="text-muted-foreground">備考</div>
                <div>{contract.remarks}</div>
              </div>
            )}
          </div>
        )}
      </section>

      <Separator />

      <section>
        <h2 className="mb-2 font-medium">進捗</h2>
        <p className="text-sm text-muted-foreground">
          現在の進捗は上部バッジで確認・更新できます。変更履歴タイムラインは
          UC-14（Activity Log）で後続実装予定です。
        </p>
      </section>
    </div>
  )
}
