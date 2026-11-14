"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"

import { useCurrentUser } from "@/components/current-user-provider"
import { PastYearNotice } from "@/components/past-year-notice"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditablePaymentStatusBadge } from "@/components/editable-payment-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ReceiptGeneratorModal } from "@/components/receipt-generator-modal"
import { EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import { businessToday } from "@/lib/business-date"
import { receiptPaymentDate } from "@/lib/payment-labels"
import { listPaymentsByYear, updatePayment } from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"
import { useSelectedYear } from "@/hooks/use-selected-year"
import type { PaymentAcrossYear, PaymentStatus } from "@/types/payment"

const ALLOWED_ROLES = ["FINANCE_DEPARTMENT", "ADMINISTRATOR"]

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

/**
 * Finance / Payment List (spec/frontend.md#Finance Management > Payment List).
 * One row per Payment (spec/model.md#Payment — one per Contract), scoped to
 * the active Year via `GET /years/{yearId}/payments` (spec/api.md#List
 * Payments Across a Year).
 *
 * The inline status badge handles confirmation and correction; the details
 * dialog records the actual received amount and remarks. This intentionally
 * never touches YearlyCompany.progress — see EditablePaymentStatusBadge.
 *
 * confirmedAt/confirmedById are set/cleared server-side from the
 * authenticated user (PATCH /payments/{id}) — no placeholder confirmer.
 * After a status change the full list is re-fetched rather than patched
 * in place, so confirmedByName (only available via the joined list
 * endpoint, not the plain PATCH response) stays correct.
 */
export default function FinancePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">読み込み中...</div>}>
      <FinancePageContent />
    </Suspense>
  )
}

function FinancePageContent() {
  const {
    selectedYear,
    selectedYearId: activeYearId,
    invalidYearSelection,
    yearLoading,
    yearError,
  } = useSelectedYear()
  const { currentUser } = useCurrentUser()
  const canConfirm = canAccess(currentUser?.roles, ALLOWED_ROLES)

  const [payments, setPayments] = useState<PaymentAcrossYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // A chosen status or payment-details edit waits here until confirmation.
  const [pendingChange, setPendingChange] = useState<{
    payment: PaymentAcrossYear
    status: PaymentStatus | null
  } | null>(null)
  const [receivedAmountDraft, setReceivedAmountDraft] = useState("")
  const [remarksDraft, setRemarksDraft] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(yearId: string | null) {
      if (!yearId) {
        setPayments([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const list = await listPaymentsByYear(yearId)
        if (!cancelled) setPayments(list)
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

  async function confirmPendingChange() {
    if (!pendingChange) return
    if (!activeYearId) return
    const trimmedAmount = receivedAmountDraft.trim()
    const receivedAmount =
      trimmedAmount === "" ? null : Number(trimmedAmount)
    if (
      trimmedAmount !== "" &&
      (typeof receivedAmount !== "number" ||
        !Number.isFinite(receivedAmount) ||
        receivedAmount < 0)
    ) {
      setError("実入金額は0以上の数値を入力してください。")
      return
    }
    if (
      (pendingChange.status === "CONFIRMED" ||
        (pendingChange.status === null &&
          pendingChange.payment.status === "CONFIRMED")) &&
      receivedAmount === null
    ) {
      setError("入金確認には実入金額が必要です。")
      return
    }

    setSavingId(pendingChange.payment.id)
    setError(null)
    try {
      await updatePayment(pendingChange.payment.id, {
        ...(pendingChange.status ? { status: pendingChange.status } : {}),
        receivedAmount,
        remarks: remarksDraft,
      })
      const refreshed = await listPaymentsByYear(activeYearId)
      setPayments(refreshed)
      setPendingChange(null)
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "更新に失敗しました" }))
    } finally {
      setSavingId(null)
    }
  }

  function openStatusChange(payment: PaymentAcrossYear, status: PaymentStatus) {
    if (status === payment.status) return
    setError(null)
    setReceivedAmountDraft(String(payment.receivedAmount ?? payment.amount))
    setRemarksDraft(payment.remarks)
    setPendingChange({ payment, status })
  }

  function openPaymentDetails(payment: PaymentAcrossYear) {
    setError(null)
    setReceivedAmountDraft(
      payment.receivedAmount === null ? "" : String(payment.receivedAmount)
    )
    setRemarksDraft(payment.remarks)
    setPendingChange({ payment, status: null })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">財務</h1>
        <p className="text-muted-foreground">
          {selectedYear?.name ?? ""}年度 入金状況の管理
        </p>
      </div>
      <PastYearNotice year={selectedYear} />

      <ErrorBanner
        message={
          (invalidYearSelection ? "指定された年度が見つかりません。" : null) ||
          yearError ||
          error
        }
      />

      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>担当メンバー</TableHead>
              <TableHead className="text-right">契約金額</TableHead>
              <TableHead className="text-right">実入金額</TableHead>
              <TableHead className="text-right">差額</TableHead>
              <TableHead>備考</TableHead>
              <TableHead>入金状況</TableHead>
              <TableHead>入金確認日</TableHead>
              <TableHead>確認者</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading ? (
              <LoadingRow colSpan={10} />
            ) : invalidYearSelection ? (
              <EmptyRow colSpan={10} message="指定された年度が見つかりません。" />
            ) : !activeYearId ? (
              <EmptyRow
                colSpan={10}
                message="年度が未作成です。年度画面から作成してください。"
              />
            ) : payments.length === 0 ? (
              <EmptyRow
                colSpan={10}
                message="この年度にはまだ入金レコードがありません。"
              />
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/yearly-companies/${payment.yearlyCompanyId}?yearId=${encodeURIComponent(activeYearId ?? "")}`}
                      className="hover:underline"
                    >
                      {payment.companyName}
                    </Link>
                    {payment.companyNameKana ? (
                      <div className="text-xs font-normal text-muted-foreground">
                        {payment.companyNameKana}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {payment.assignedMemberName ?? "未割当"}
                  </TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.receivedAmount === null
                      ? "-"
                      : currencyFormatter.format(payment.receivedAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.receivedAmount === null ||
                    payment.receivedAmount === payment.amount
                      ? "-"
                      : currencyFormatter.format(
                          payment.receivedAmount - payment.amount
                        )}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-pre-wrap">
                    {payment.remarks || "-"}
                  </TableCell>
                  <TableCell>
                    <EditablePaymentStatusBadge
                      value={payment.status}
                      onChange={(status) => openStatusChange(payment, status)}
                      disabled={savingId === payment.id || !canConfirm}
                    />
                  </TableCell>
                  <TableCell>{payment.confirmedAt ?? "-"}</TableCell>
                  <TableCell>{payment.confirmedByName ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canConfirm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPaymentDetails(payment)}
                        >
                          金額・備考
                        </Button>
                      )}
                      <ReceiptGeneratorModal
                        initialData={{
                          companyName: payment.companyName,
                          amount:
                            payment.status === "CONFIRMED"
                              ? payment.receivedAmount ?? payment.amount
                              : payment.amount,
                          issuedDate: businessToday(),
                          paymentDate: receiptPaymentDate(payment),
                        }}
                        fileName={`領収書_${payment.companyName}.pdf`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pendingChange && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next && savingId === null) setPendingChange(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {pendingChange.status === "CONFIRMED"
                  ? "入金を確認済みにしますか？"
                  : pendingChange.status === "WAITING"
                    ? "入金待ちに戻しますか？"
                    : "入金情報を更新"}
              </DialogTitle>
              <DialogDescription>
                {pendingChange.status === "CONFIRMED"
                  ? `${pendingChange.payment.companyName}の入金（${currencyFormatter.format(receivedAmountDraft.trim() && Number.isFinite(Number(receivedAmountDraft)) ? Number(receivedAmountDraft) : pendingChange.payment.amount)}）を確認済みにします。`
                  : pendingChange.status === "WAITING"
                    ? `${pendingChange.payment.companyName}の入金を入金待ちに戻します。`
                    : `${pendingChange.payment.companyName}の入金情報を更新します。`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="receivedAmount">実入金額</label>
                <Input
                  id="receivedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receivedAmountDraft}
                  onChange={(event) => setReceivedAmountDraft(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="paymentRemarks">備考</label>
                <Textarea
                  id="paymentRemarks"
                  value={remarksDraft}
                  onChange={(event) => setRemarksDraft(event.target.value)}
                />
              </div>
            </div>
            <ErrorBanner message={error} />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingChange(null)}
                disabled={savingId !== null}
              >
                キャンセル
              </Button>
              <Button
                onClick={() => void confirmPendingChange()}
                disabled={savingId !== null}
              >
                {savingId !== null
                  ? "保存中..."
                  : pendingChange.status === "CONFIRMED"
                    ? "確認済みにする"
                    : pendingChange.status === "WAITING"
                      ? "入金待ちに戻す"
                      : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
