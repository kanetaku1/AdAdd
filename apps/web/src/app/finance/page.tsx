"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useActiveYear } from "@/components/active-year-provider"
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
import { listPaymentsByYear, updatePaymentStatus } from "@/lib/data/sponsorship"
import type { PaymentAcrossYear, PaymentStatus } from "@/types/payment"

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
          setError(e instanceof Error ? e.message : "読み込みに失敗しました")
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
      setError(e instanceof Error ? e.message : "更新に失敗しました")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="text-muted-foreground">
          {activeYear?.name ?? ""}年度 入金状況の管理
        </p>
      </div>

      {(yearError || error) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {yearError || error}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead className="text-right">契約金額</TableHead>
              <TableHead>入金状況</TableHead>
              <TableHead>入金確認日</TableHead>
              <TableHead>確認者</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearLoading || loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : !activeYearId ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  年度が未作成です。Years から年度を作成してください。
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  この年度にはまだ入金レコードがありません。
                </TableCell>
              </TableRow>
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
                      disabled={savingId === payment.id}
                    />
                  </TableCell>
                  <TableCell>{payment.confirmedAt ?? "-"}</TableCell>
                  <TableCell>{payment.confirmedByName ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {payment.status === "CONFIRMED" && (
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
                    )}
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
