import type { PaymentStatus } from "@/types/payment"

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
