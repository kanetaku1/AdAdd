import type { Payment, PaymentStatus } from "@/types/payment"

/**
 * Placeholder data matching the GET /contracts/{contractId}/payment response
 * shape (spec/api.md). One Payment per SponsorshipContract (spec/model.md
 * Constraints: contractId is unique on Payment). Replace with a real fetch
 * once the backend Payment endpoints exist.
 */
export const mockPayments: Payment[] = [
  {
    id: "payment_001",
    contractId: "contract_001", // 株式会社長岡テクノ
    amount: 95000,
    status: "WAITING",
    confirmedAt: null,
    confirmedById: null,
    confirmedByName: null,
  },
  {
    id: "payment_002",
    contractId: "contract_002", // 越後電機株式会社
    amount: 50000,
    status: "WAITING",
    confirmedAt: null,
    confirmedById: null,
    confirmedByName: null,
  },
  {
    id: "payment_003",
    contractId: "contract_003", // 北越フーズ株式会社 — yc_004.progress is already PAYMENT_RECEIVED
    amount: 130000,
    status: "CONFIRMED",
    confirmedAt: "2026-07-01",
    confirmedById: "user_kobayashi",
    confirmedByName: "小林",
  },
]

/**
 * Mutates the shared mock array so a Payment created alongside a new
 * Sponsorship Contract persists for the rest of the browser session
 * (spec/domain.md#Sponsorship Contract — created when totalAmount > 0).
 * TODO: replace with POST /contracts/{contractId}/payment once the backend
 * exists (spec/api.md).
 */
export function addPayment(payment: Payment): void {
  mockPayments.push(payment)
}

/**
 * Mirrors PATCH /payments/{id} (spec/api.md#Update Payment Status):
 * confirmedAt/confirmedById are set/cleared here exactly as the backend does
 * server-side — callers never pass them directly for a CONFIRMED->WAITING move.
 */
export function updatePayment(
  id: string,
  status: PaymentStatus,
  confirmedById: string | null,
  confirmedByName: string | null
): Payment {
  const index = mockPayments.findIndex((p) => p.id === id)
  if (index === -1) throw new Error("payment not found")
  const updated: Payment =
    status === "CONFIRMED"
      ? {
          ...mockPayments[index],
          status,
          confirmedAt: new Date().toISOString().slice(0, 10),
          confirmedById,
          confirmedByName,
        }
      : {
          ...mockPayments[index],
          status,
          confirmedAt: null,
          confirmedById: null,
          confirmedByName: null,
        }
  mockPayments[index] = updated
  return updated
}
