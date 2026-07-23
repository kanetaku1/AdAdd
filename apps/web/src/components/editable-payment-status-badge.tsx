"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PAYMENT_STATUS_BADGE_VARIANT,
  PAYMENT_STATUS_LABEL,
} from "@/lib/payment-labels"
import type { PaymentStatus } from "@/types/payment"

/**
 * Inline-editable Payment.status badge (spec/frontend.md UI Principle 4;
 * Finance Management > Payment List "Confirm payment" / "Update status").
 * Only the Finance Department may change this (spec/business.md).
 *
 * IMPORTANT: confirming or reverting a Payment here must never write to
 * YearlyCompany.progress. Payment.status (Waiting/Confirmed) is a
 * deliberately simpler, separate state machine from YearlyCompany.progress
 * (InvoiceSent/PaymentReceived/ReceiptSent) — advancing progress after
 * payment is a distinct, later action taken by a Sponsorship Member
 * (UC-10 Send Receipt), and the Finance Department is explicitly
 * restricted from editing sponsorship progress (spec/business.md).
 */
export function EditablePaymentStatusBadge({
  value,
  onChange,
  disabled,
}: {
  value: PaymentStatus
  onChange: (value: PaymentStatus) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Select
        value={value}
        defaultOpen
        onValueChange={(next) => {
          onChange(next as PaymentStatus)
          setEditing(false)
        }}
        onOpenChange={(open) => {
          if (!open) setEditing(false)
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PAYMENT_STATUS_LABEL).map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Badge
      variant={PAYMENT_STATUS_BADGE_VARIANT[value]}
      className={disabled ? "opacity-50" : "cursor-pointer"}
      onClick={() => {
        if (!disabled) setEditing(true)
      }}
    >
      {PAYMENT_STATUS_LABEL[value]}
    </Badge>
  )
}
