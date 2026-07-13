import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { mockCompanies } from "@/lib/mock/companies"
import { mockContractMenus } from "@/lib/mock/contract-menus"
import { mockPayments } from "@/lib/mock/payments"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import {
  PAYMENT_STATUS_BADGE_VARIANT,
  PAYMENT_STATUS_LABEL,
} from "@/lib/payment-labels"
import { ContractMenuSection } from "@/components/contract-menu-section"
import { ContractProgressBadge } from "@/components/contract-progress-badge"
import { InvoiceGeneratorModal } from "@/components/invoice-generator-modal"
import type { InvoiceData } from "@/lib/pdf/invoice-document"

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Sponsorship Contract Detail (spec/frontend.md#Contract Detail).
 * Company -> Contract -> Contract Menus (quantity/price/production status) -> Total.
 *
 * TODO: replace mock lookups with real fetches once the backend Contract /
 * Contract Menu endpoints exist (spec/api.md).
 */
export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const contract = mockSponsorshipContracts.find((c) => c.id === id)
  if (!contract) {
    notFound()
  }

  const yearlyCompany = mockYearlyCompanies.find(
    (yc) => yc.id === contract.yearlyCompanyId
  )
  const company = mockCompanies.find((c) => c.id === yearlyCompany?.companyId)
  const contractMenus = mockContractMenus.filter(
    (cm) => cm.contractId === contract.id
  )
  const payment = mockPayments.find((p) => p.contractId === contract.id)

  const today = new Date()
  const defaultDeadline = new Date(today)
  defaultDeadline.setDate(defaultDeadline.getDate() + 14)

  const invoiceData: InvoiceData = {
    companyName: yearlyCompany?.companyName ?? "(不明な企業)",
    contactPersonName: company?.contactPersonName ?? "",
    subject: "技大祭企業協賛",
    issuedDate: formatDate(today),
    deadline: formatDate(defaultDeadline),
    staffName: contract.assigneeName ?? "",
    remark: contract.remarks,
    items: contractMenus.map((cm) => ({
      name:
        mockSponsorshipMenus.find((m) => m.id === cm.sponsorshipMenuId)
          ?.name ?? "(不明なメニュー)",
      quantity: cm.quantity,
      unitPrice: cm.unitPrice,
    })),
    totalAmount: contract.totalAmount,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {yearlyCompany?.companyName ?? "(不明な企業)"}
          </h1>
          <p className="text-muted-foreground">
            契約日 {contract.contractDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {yearlyCompany && (
            <ContractProgressBadge initialProgress={yearlyCompany.progress} />
          )}
          <InvoiceGeneratorModal
            initialData={invoiceData}
            fileName={`請求書_${invoiceData.companyName}.pdf`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-4">
        <div>
          <div className="text-muted-foreground">企業担当者(先方)</div>
          <div>{company?.contactPersonName ?? "-"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">担当者(委員会)</div>
          <div>{contract.assigneeName ?? "未割当"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">入金状況</div>
          <div>
            {payment ? (
              <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[payment.status]}>
                {PAYMENT_STATUS_LABEL[payment.status]}
              </Badge>
            ) : (
              "入金情報なし"
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {yearlyCompany && (
            <Link
              href={`/yearly-companies/${yearlyCompany.id}`}
              className="text-muted-foreground hover:underline"
            >
              Yearly Company を見る →
            </Link>
          )}
          <Link
            href="/finance"
            className="text-muted-foreground hover:underline"
          >
            Finance を見る →
          </Link>
        </div>
      </div>

      <Separator />

      <ContractMenuSection
        contractId={contract.id}
        initialContractMenus={contractMenus}
        initialTotalAmount={contract.totalAmount}
      />

      {contract.remarks && (
        <div className="text-sm">
          <div className="text-muted-foreground">備考</div>
          <div>{contract.remarks}</div>
        </div>
      )}
    </div>
  )
}
