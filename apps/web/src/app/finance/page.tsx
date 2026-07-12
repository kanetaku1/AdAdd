"use client"

import { useState } from "react"
import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditablePaymentStatusBadge } from "@/components/editable-payment-status-badge"
import { mockPayments } from "@/lib/mock/payments"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import type { Payment, PaymentStatus } from "@/types/payment"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

/**
 * Finance / Payment List (spec/frontend.md#Finance Management > Payment List).
 * One row per Payment (spec/model.md#Payment — one per Contract).
 *
 * "Confirm payment" and "Update status" (spec/frontend.md Actions) are both
 * handled by the same inline status badge — flipping Waiting -> Confirmed
 * *is* "confirm payment"; flipping back is a correction. This intentionally
 * never touches YearlyCompany.progress — see EditablePaymentStatusBadge.
 *
 * TODO: replace mockPayments with GET /contracts/{contractId}/payment, and
 * wire status edits to PATCH /payments/{paymentId} once the backend exists
 * (spec/api.md).
 * TODO: once auth exists, stamp confirmedById/confirmedByName from the
 * authenticated user instead of the placeholder used here.
 */
export default function FinancePage() {
  const [payments, setPayments] = useState<Payment[]>(mockPayments)

  function setStatus(paymentId: string, status: PaymentStatus) {
    setPayments((prev) =>
      prev.map((payment) => {
        if (payment.id !== paymentId) return payment
        if (status === "CONFIRMED") {
          return {
            ...payment,
            status,
            confirmedAt: new Date().toISOString().slice(0, 10),
            confirmedById: "user_finance_current",
            confirmedByName: "経理担当",
          }
        }
        return {
          ...payment,
          status,
          confirmedAt: null,
          confirmedById: null,
          confirmedByName: null,
        }
      })
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="text-muted-foreground">2026年度 入金状況の管理</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead className="text-right">契約金額</TableHead>
              <TableHead>入金状況</TableHead>
              <TableHead>入金日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const contract = mockSponsorshipContracts.find(
                (c) => c.id === payment.contractId
              )
              const yearlyCompany = mockYearlyCompanies.find(
                (yc) => yc.id === contract?.yearlyCompanyId
              )
              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/contracts/${payment.contractId}`}
                      className="hover:underline"
                    >
                      {yearlyCompany?.companyName ?? "(不明な企業)"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <EditablePaymentStatusBadge
                      value={payment.status}
                      onChange={(status) => setStatus(payment.id, status)}
                    />
                  </TableCell>
                  <TableCell>{payment.confirmedAt ?? "-"}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
