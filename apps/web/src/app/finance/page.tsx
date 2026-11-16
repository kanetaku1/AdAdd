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
import {
  Dialog,
  DialogContent,
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
 * The inline status badge handles confirmation and correction in the active
 * Year. Past-Year payments are read-only. This intentionally never touches
 * YearlyCompany.progress — see EditablePaymentStatusBadge.
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
    isPastYear,
    yearLoading,
    yearError,
  } = useSelectedYear()
  const { currentUser } = useCurrentUser()
  const canUpdatePayments = canAccess(currentUser?.roles, ALLOWED_ROLES) && !isPastYear

  const [payments, setPayments] = useState<PaymentAcrossYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingChange, setPendingChange] = useState<{
    payment: PaymentAcrossYear
    status: PaymentStatus
  } | null>(null)
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

    setSavingId(pendingChange.payment.id)
    setError(null)
    try {
      await updatePayment(pendingChange.payment.id, {
        status: pendingChange.status,
        ...(pendingChange.status === "CONFIRMED"
          ? {
              receivedAmount:
                pendingChange.payment.receivedAmount ??
                pendingChange.payment.amount,
            }
          : {}),
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
    setPendingChange({ payment, status })
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
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>担当メンバー</TableHead>
              <TableHead className="text-right">契約金額</TableHead>
              <TableHead>入金状況</TableHead>
              <TableHead>入金確認日</TableHead>
              <TableHead>確認者</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading ? (
              <LoadingRow colSpan={7} />
            ) : invalidYearSelection ? (
              <EmptyRow colSpan={7} message="指定された年度が見つかりません。" />
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
                  <TableCell>
                    <EditablePaymentStatusBadge
                      value={payment.status}
                      onChange={(status) => openStatusChange(payment, status)}
                      disabled={savingId === payment.id || !canUpdatePayments}
                    />
                  </TableCell>
                  <TableCell>{payment.confirmedAt ?? "-"}</TableCell>
                  <TableCell>{payment.confirmedByName ?? "-"}</TableCell>
                  <TableCell className="text-right">
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
                  : "入金待ちに戻しますか？"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {pendingChange.status === "CONFIRMED"
                  ? `${pendingChange.payment.companyName}の入金（${currencyFormatter.format(pendingChange.payment.amount)}）を確認済みにします。`
                  : `${pendingChange.payment.companyName}の入金を入金待ちに戻します。`}
              </p>
            </DialogHeader>
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
                    : "入金待ちに戻す"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
