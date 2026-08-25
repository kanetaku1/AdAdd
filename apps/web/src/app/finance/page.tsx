"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useActiveYear } from "@/components/active-year-provider"
import { useCurrentUser } from "@/components/current-user-provider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditablePaymentStatusBadge } from "@/components/editable-payment-status-badge"
import { ReceiptGeneratorModal } from "@/components/receipt-generator-modal"
import { EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import { listPaymentsByYear, updatePaymentStatus } from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"
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
 * "Confirm payment" and "Update status" (spec/frontend.md Actions) are both
 * handled by the same inline status badge — flipping Waiting -> Confirmed
 * *is* "confirm payment"; flipping back is a correction. This intentionally
 * never touches YearlyCompany.progress — see EditablePaymentStatusBadge.
 *
 * confirmedAt/confirmedById are set/cleared server-side from the
 * authenticated user (PATCH /payments/{id}) — no placeholder confirmer.
 * After a status change the full list is re-fetched rather than patched
 * in place, so confirmedByName (only available via the joined list
 * endpoint, not the plain PATCH response) stays correct.
 */
export default function FinancePage() {
  const { activeYear, loading: yearLoading, error: yearError } = useActiveYear()
  const activeYearId = activeYear?.id ?? null
  const { currentUser } = useCurrentUser()
  const canConfirm = canAccess(currentUser?.roles, ALLOWED_ROLES)

  const [payments, setPayments] = useState<PaymentAcrossYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  async function handleStatusChange(paymentId: string, status: PaymentStatus) {
    if (!activeYearId) return
    setSavingId(paymentId)
    setError(null)
    try {
      await updatePaymentStatus(paymentId, status)
      const refreshed = await listPaymentsByYear(activeYearId)
      setPayments(refreshed)
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "更新に失敗しました" }))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">財務</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}年度 入金状況の管理
        </p>
      </div>

      <ErrorBanner message={yearError || error} />

      <div className="rounded-md border">
        <Table>
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
            ) : !activeYearId ? (
              <EmptyRow
                colSpan={7}
                message="年度が未作成です。年度画面から作成してください。"
              />
            ) : payments.length === 0 ? (
              <EmptyRow
                colSpan={7}
                message="この年度にはまだ入金レコードがありません。"
              />
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/yearly-companies/${payment.yearlyCompanyId}`}
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
                      onChange={(status) =>
                        void handleStatusChange(payment.id, status)
                      }
                      disabled={savingId === payment.id || !canConfirm}
                    />
                  </TableCell>
                  <TableCell>{payment.confirmedAt ?? "-"}</TableCell>
                  <TableCell>{payment.confirmedByName ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <ReceiptGeneratorModal
                      initialData={{
                        companyName: payment.companyName,
                        amount: payment.amount,
                        issuedDate: new Date().toISOString().slice(0, 10),
                        paymentDate:
                          payment.confirmedAt ??
                          new Date().toISOString().slice(0, 10),
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
    </div>
  )
}
