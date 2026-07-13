import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ContractMenuSection } from "@/components/contract-menu-section"
import { CreateContractSection } from "@/components/create-contract-section"
import { InvoiceGeneratorModal } from "@/components/invoice-generator-modal"
import { YearlyCompanyAssignedMember } from "@/components/yearly-company-assigned-member"
import { YearlyCompanyProgress } from "@/components/yearly-company-progress"
import { advisorIdForMember } from "@/lib/mock/advisor-assignments"
import { mockCompanies } from "@/lib/mock/companies"
import { mockContractMenus } from "@/lib/mock/contract-menus"
import { mockPayments } from "@/lib/mock/payments"
import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import { mockUsers } from "@/lib/mock/users"
import { mockYearlyCompanies } from "@/lib/mock/yearly-companies"
import {
  PAYMENT_STATUS_BADGE_VARIANT,
  PAYMENT_STATUS_LABEL,
} from "@/lib/payment-labels"
import type { InvoiceData } from "@/lib/pdf/invoice-document"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
})

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Yearly Company Detail (spec/frontend.md#Yearly Company Detail, UC-13
 * Result — this is the "everything in one place" screen a search result
 * opens into).
 *
 * Contract and Contract Menu are both shown directly here — there is no
 * separate Contract Detail route (YearlyCompany:SponsorshipContract is 1:1,
 * spec/model.md, so a dedicated page for it never added anything this
 * screen couldn't already hold). Progress History is just the live progress
 * badge for now; a real history timeline is UC-14.
 *
 * TODO: replace mock lookups with real fetches once the backend YearlyCompany
 * endpoints exist (spec/api.md).
 */
export default async function YearlyCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const yearlyCompany = mockYearlyCompanies.find((yc) => yc.id === id)
  if (!yearlyCompany) {
    notFound()
  }

  const company = mockCompanies.find((c) => c.id === yearlyCompany.companyId)
  const contract = mockSponsorshipContracts.find(
    (c) => c.yearlyCompanyId === yearlyCompany.id
  )
  const contractMenus = contract
    ? mockContractMenus.filter((cm) => cm.contractId === contract.id)
    : []
  const payment = contract
    ? mockPayments.find((p) => p.contractId === contract.id)
    : undefined
  const advisorId = advisorIdForMember(
    yearlyCompany.yearId,
    yearlyCompany.assignedMemberId
  )
  const advisorName = advisorId
    ? mockUsers.find((u) => u.id === advisorId)?.name ?? "(不明なユーザー)"
    : null

  const today = new Date()
  const defaultDeadline = new Date(today)
  defaultDeadline.setDate(defaultDeadline.getDate() + 14)

  const invoiceData: InvoiceData | null = contract
    ? {
        companyName: yearlyCompany.companyName,
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
    : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{yearlyCompany.companyName}</h1>
        <YearlyCompanyProgress
          yearlyCompanyId={yearlyCompany.id}
          initialProgress={yearlyCompany.progress}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">企業情報</h2>
          {company && (
            <Link
              href={`/companies/${company.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              会社情報を編集 →
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-4">
          <div>
            <div className="text-muted-foreground">企業担当者(先方)</div>
            <div>{company?.contactPersonName ?? "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">連絡先</div>
            <div>{company?.contactEmailOrForm ?? "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">電話番号 / 住所</div>
            <div>{company?.phoneNumber ?? "-"}</div>
            <div className="text-xs text-muted-foreground">
              {company?.address}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">協賛開始年度</div>
            <div>{company?.firstSponsorshipYear ?? "-"}</div>
          </div>
          {company?.memo && (
            <div className="col-span-2 sm:col-span-4">
              <div className="text-muted-foreground">メモ</div>
              <div>{company.memo}</div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">担当</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-4">
          <div>
            <div className="text-muted-foreground">協賛実働メンバー</div>
            <YearlyCompanyAssignedMember
              yearlyCompanyId={yearlyCompany.id}
              initialAssignedMemberId={yearlyCompany.assignedMemberId}
              initialAssignedMemberName={yearlyCompany.assignedMemberName}
            />
          </div>
          <div>
            <div className="text-muted-foreground">協賛アドバイザー</div>
            <div>{advisorName ?? "未設定"}</div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">契約</h2>
          {contract && invoiceData && (
            <InvoiceGeneratorModal
              initialData={invoiceData}
              fileName={`請求書_${invoiceData.companyName}.pdf`}
            />
          )}
        </div>

        {contract ? (
          <>
            <div className="flex items-center gap-8 rounded-md border p-4 text-sm">
              <div>
                <div className="text-muted-foreground">契約日</div>
                <div>{contract.contractDate}</div>
              </div>
              <div>
                <div className="text-muted-foreground">合計金額</div>
                <div>{currencyFormatter.format(contract.totalAmount)}</div>
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
              <Link
                href="/finance"
                className="ml-auto text-muted-foreground hover:underline"
              >
                Finance を見る →
              </Link>
            </div>

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
          </>
        ) : (
          <CreateContractSection
            yearlyCompanyId={yearlyCompany.id}
            assigneeName={yearlyCompany.assignedMemberName}
          />
        )}
      </div>
    </div>
  )
}
