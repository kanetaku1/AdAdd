import { toBusinessDate } from "@/lib/business-date"
import type { Payment, PaymentStatus } from "@/types/payment"

/**
 * UI Design Principle 2 (spec/frontend.md): show business language, not raw enum values.
 */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  WAITING: "入金待ち",
  CONFIRMED: "入金確認済み",
}

export const PAYMENT_STATUS_BADGE_VARIANT: Record<
  PaymentStatus,
  "default" | "secondary" | "outline"
> = {
  WAITING: "outline",
  CONFIRMED: "default",
}

/**
 * `confirmedAt` is stored as datetime (spec/model.md#Payment) but the
 * business value is the confirmation *day*. Format in JST so the date
 * matches the day Finance confirmed in Japan, not the UTC clock.
 */
export function toConfirmationDate(
  iso: string | null | undefined
): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    const sliced = iso.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(sliced) ? sliced : null
  }
  return toBusinessDate(date)
}

/**
 * Default receipt payment date (入金日) — FR-015 → Receipt Timing. A
 * CONFIRMED Payment defaults to its confirmation date. A WAITING one (a
 * face-to-face contract, before Finance confirms) has no default: the member
 * enters the day the money was received.
 */
export function receiptPaymentDate(
  payment: Pick<Payment, "status" | "confirmedAt">
): string {
  return payment.status === "CONFIRMED" ? (payment.confirmedAt ?? "") : ""
}
