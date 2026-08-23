"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ActivityLogSection } from "@/components/activity-log-section"
import { AssignmentSection } from "@/components/assignment-section"
import { CompanyInfoSection } from "@/components/company-info-section"
import {
  ContractCreationForm,
  type ContractCreationInput,
} from "@/components/contract-creation-form"
import { ContractMenuSection } from "@/components/contract-menu-section"
import { useCurrentUser } from "@/components/current-user-provider"
import { EditableProgressBadge } from "@/components/editable-progress-badge"
import { InvoiceGeneratorModal } from "@/components/invoice-generator-modal"
import { ReceiptGeneratorModal } from "@/components/receipt-generator-modal"
import { ErrorBanner, LoadingBlock } from "@/components/query-state"
import { isApiEnabled } from "@/lib/api/client"
import { canAccess } from "@/lib/auth/roles"
import { listAdvisorAssignmentsByYear } from "@/lib/data/advisor-assignments"
import {
  assignMember,
  createContractWithMenus,
  createPayment,
  getCompany,
  getContractByYearlyCompany,
  getPaymentByContract,
  getYearlyCompany,
  listContractMenus,
  listActivityLogsByYearlyCompany,
  listSponsorshipMenus,
  listUsers,
  updateYearlyCompanyProgress,
} from "@/lib/data/sponsorship"
import { getErrorMessage } from "@/lib/errors"
import type { InvoiceData } from "@/lib/pdf/invoice-document"
import {
  PAYMENT_STATUS_BADGE_VARIANT,
  PAYMENT_STATUS_LABEL,
} from "@/lib/payment-labels"
import {
  COMPANY_STATUS_LABEL,
  SPONSORSHIP_PHASE_LABEL,
} from "@/lib/yearly-company-labels"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
import type { ActivityLog } from "@/types/activity-log"
import type { Company } from "@/types/company"
import type { ContractMenu } from "@/types/contract-menu"
import type { Payment } from "@/types/payment"
import type { SponsorshipContract } from "@/types/sponsorship-contract"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"
import type { User } from "@/types/user"
import type {
  SponsorshipProgress,
  YearlyCompany,
} from "@/types/yearly-company"

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Yearly Company Detail — main operation screen (spec/frontend.md#Yearly Company Detail).
 * Aggregates company info, assignment, contract, contract menus, progress, invoice, payment.
 */
export default function YearlyCompanyDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { currentUser } = useCurrentUser()
  const canEditStatusPhaseProgress = canAccess(currentUser?.roles, [
    "SPONSORSHIP_MEMBER",
    "ADMINISTRATOR",
  ])
  const canEditAssignee = canAccess(currentUser?.roles, ["ADMINISTRATOR"])
  const canManageContract = canAccess(currentUser?.roles, [
    "SPONSORSHIP_MEMBER",
    "ADMINISTRATOR",
  ])
  const canCreatePayment = canAccess(currentUser?.roles, [
    "SPONSORSHIP_MEMBER",
    "ADMINISTRATOR",
    "FINANCE_DEPARTMENT",
  ])

  const [loading, setLoading] = useState(true)
  const [yearlyCompany, setYearlyCompany] = useState<YearlyCompany | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [contract, setContract] = useState<SponsorshipContract | null>(null)
  const [contractMenus, setContractMenus] = useState<ContractMenu[]>([])
  const [payment, setPayment] = useState<Payment | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [menus, setMenus] = useState<SponsorshipMenu[]>([])
  const [advisorAssignments, setAdvisorAssignments] = useState<
    AdvisorAssignment[]
  >([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Data fetch for route param — setState after async I/O is intentional. */
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const yc = await getYearlyCompany(id)
        if (cancelled) return
        if (!yc) {
          setYearlyCompany(null)
          return
        }
        setYearlyCompany(yc)
        const [co, ct, us, sm, aa, logs] = await Promise.all([
          getCompany(yc.companyId),
          getContractByYearlyCompany(yc.id),
          listUsers(),
          listSponsorshipMenus(yc.yearId),
          listAdvisorAssignmentsByYear(yc.yearId),
          listActivityLogsByYearlyCompany(yc.id),
        ])
        if (cancelled) return
        setCompany(co)
        setContract(ct)
        setUsers(us)
        setMenus(sm)
        setAdvisorAssignments(aa)
        setActivityLogs(logs)
        if (ct) {
          const [cms, pay] = await Promise.all([
            listContractMenus(ct.id),
            getPaymentByContract(ct.id),
          ])
          if (cancelled) return
          setContractMenus(cms)
          setPayment(pay)
        } else {
          setContractMenus([])
          setPayment(null)
        }
      } catch (e) {
        if (!cancelled) {
          setYearlyCompany(null)
          setError(getErrorMessage(e, { fallback: "読み込みに失敗しました" }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const yc = await getYearlyCompany(id)
      if (!yc) {
        setYearlyCompany(null)
        return
      }
      setYearlyCompany(yc)
      const [co, ct, us, sm, aa, logs] = await Promise.all([
        getCompany(yc.companyId),
        getContractByYearlyCompany(yc.id),
        listUsers(),
        listSponsorshipMenus(yc.yearId),
        listAdvisorAssignmentsByYear(yc.yearId),
        listActivityLogsByYearlyCompany(yc.id),
      ])
      setCompany(co)
      setContract(ct)
      setUsers(us)
      setMenus(sm)
      setAdvisorAssignments(aa)
      setActivityLogs(logs)
      if (ct) {
        const [cms, pay] = await Promise.all([
          listContractMenus(ct.id),
          getPaymentByContract(ct.id),
        ])
        setContractMenus(cms)
        setPayment(pay)
      } else {
        setContractMenus([])
        setPayment(null)
      }
    } catch (e) {
      setYearlyCompany(null)
      setError(getErrorMessage(e, { fallback: "読み込みに失敗しました" }))
    } finally {
      setLoading(false)
    }
  }, [id])

  const memberAdvisorNames = useMemo(() => {
    const memberId = yearlyCompany?.assignedMemberId
    if (!memberId) return []
    return advisorAssignments
      .filter((a) => a.memberId === memberId)
      .map((a) => users.find((u) => u.id === a.advisorId)?.name ?? "(不明なユーザー)")
  }, [advisorAssignments, users, yearlyCompany])

  const invoiceData: InvoiceData | null = useMemo(() => {
    if (!yearlyCompany || !contract) return null
    const today = new Date()
    const deadline = new Date(today)
    deadline.setDate(deadline.getDate() + 14)
    return {
      companyName: yearlyCompany.companyName,
      contactPersonName: company?.contactPersonName ?? "",
      subject: "技大祭企業協賛",
      issuedDate: formatDate(today),
      deadline: formatDate(deadline),
      staffName: contract.assigneeName ?? yearlyCompany.assignedMemberName ?? "",
      remark: contract.remarks,
      items: contractMenus.map((cm) => ({
        name:
          menus.find((m) => m.id === cm.sponsorshipMenuId)?.name ??
          "(不明なメニュー)",
        quantity: cm.quantity,
        unitPrice: cm.unitPrice,
      })),
      totalAmount: contract.totalAmount,
    }
  }, [yearlyCompany, company, contract, contractMenus, menus])

  if (loading) {
    return <LoadingBlock />
  }

  if (error && !yearlyCompany) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">読み込みエラー</h1>
        <ErrorBanner message={error} />
        <Link href="/yearly-companies" className="text-sm hover:underline">
          Yearly Companies に戻る
        </Link>
      </div>
    )
  }

  if (!yearlyCompany) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">見つかりません</h1>
        <Link href="/yearly-companies" className="text-sm hover:underline">
          Yearly Companies に戻る
        </Link>
      </div>
    )
  }

  const yc = yearlyCompany

  async function handleAssign(userId: string | null) {
    setError(null)
    setBusy(true)
    try {
      await assignMember(yc.id, userId)
      const name = users.find((u) => u.id === userId)?.name ?? null
      setYearlyCompany((prev) =>
        prev
          ? {
              ...prev,
              assignedMemberId: userId,
              assignedMemberName: name,
            }
          : prev
      )
    } catch (e) {
      setError(
        getErrorMessage(e, { fallback: "担当メンバーの更新に失敗しました" })
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleProgress(progress: SponsorshipProgress) {
    setError(null)
    setBusy(true)
    try {
      await updateYearlyCompanyProgress(yc.id, progress)
      setYearlyCompany((prev) => (prev ? { ...prev, progress } : prev))
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "進捗の更新に失敗しました" }))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateContract(
    input: ContractCreationInput
  ): Promise<boolean> {
    setError(null)
    setBusy(true)
    try {
      await createContractWithMenus(yc.id, input)
      await reload()
      return true
    } catch (e) {
      setError(
        getErrorMessage(e, {
          fallback: "契約の作成に失敗しました",
          overrides: { CONFLICT: "この企業には既に契約が存在します。" },
        })
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleCreatePayment() {
    if (!contract) return
    setBusy(true)
    setError(null)
    try {
      const created = await createPayment(contract.id)
      setPayment(created)
      await reload()
    } catch (e) {
      setError(
        getErrorMessage(e, { fallback: "入金レコードの作成に失敗しました" })
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!isApiEnabled() && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          開発モード: `NEXT_PUBLIC_API_BASE_URL`
          未設定のため mock データを使用しています。認証は X-User-ID /
          X-User-Roles スタブです。
        </p>
      )}

      <ErrorBanner message={error} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/yearly-companies" className="hover:underline">
              Yearly Companies
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">{yearlyCompany.companyName}</h1>
          <p className="text-muted-foreground">
            {COMPANY_STATUS_LABEL[yearlyCompany.companyStatus]} ·{" "}
            {SPONSORSHIP_PHASE_LABEL[yearlyCompany.phase]}
          </p>
        </div>
        <EditableProgressBadge
          value={yearlyCompany.progress}
          onChange={(value) => void handleProgress(value)}
          disabled={busy || !canEditStatusPhaseProgress}
        />
      </div>

      <CompanyInfoSection company={company} notes={yearlyCompany.notes} />

      <AssignmentSection
        assignedMemberId={yearlyCompany.assignedMemberId}
        assignedMemberName={yearlyCompany.assignedMemberName}
        advisorNames={memberAdvisorNames}
        users={users}
        onAssign={(userId) => void handleAssign(userId)}
        disabled={busy || !canEditAssignee}
      />

      <Separator />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">契約</h2>
          {contract && invoiceData && (
            <div className="flex flex-wrap items-center gap-2">
              <InvoiceGeneratorModal
                initialData={invoiceData}
                fileName={`請求書_${invoiceData.companyName}.pdf`}
              />
              {contract.totalAmount > 0 && !payment && canCreatePayment && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleCreatePayment()}
                >
                  入金レコードを作成
                </Button>
              )}
              {payment && (
                <ReceiptGeneratorModal
                  initialData={{
                    companyName: yearlyCompany.companyName,
                    amount: payment.amount,
                    issuedDate: new Date().toISOString().slice(0, 10),
                    paymentDate:
                      payment.confirmedAt ??
                      new Date().toISOString().slice(0, 10),
                  }}
                  fileName={`領収書_${yearlyCompany.companyName}.pdf`}
                />
              )}
            </div>
          )}
        </div>

        {!contract && canManageContract && (
          <ContractCreationForm
            menus={menus}
            busy={busy}
            onCreate={handleCreateContract}
          />
        )}

        {contract && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-muted-foreground">契約日</div>
                <div>{contract.contractDate}</div>
              </div>
              <div>
                <div className="text-muted-foreground">担当者（委員会）</div>
                <div>
                  {contract.assigneeName ??
                    yearlyCompany.assignedMemberName ??
                    "未割当"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">入金状況</div>
                <div>
                  {payment ? (
                    <Badge
                      variant={PAYMENT_STATUS_BADGE_VARIANT[payment.status]}
                    >
                      {PAYMENT_STATUS_LABEL[payment.status]}
                    </Badge>
                  ) : contract.totalAmount > 0 ? (
                    "未作成"
                  ) : (
                    "物品協賛（入金なし）"
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">合計金額</div>
                <div>
                  {new Intl.NumberFormat("ja-JP", {
                    style: "currency",
                    currency: "JPY",
                  }).format(contract.totalAmount)}
                </div>
              </div>
            </div>

            <Link
              href={`/contract-menus?companyName=${encodeURIComponent(yearlyCompany.companyName)}`}
              className="text-sm hover:underline"
            >
              協賛メニュー一覧で詳細を見る →
            </Link>

            <ContractMenuSection
              key={contract.id}
              contractId={contract.id}
              initialContractMenus={contractMenus}
              initialTotalAmount={contract.totalAmount}
              menus={menus}
              onChanged={({ contractMenus: nextMenus, totalAmount }) => {
                setContractMenus(nextMenus)
                setContract((prev) =>
                  prev ? { ...prev, totalAmount } : prev
                )
                setPayment((prev) =>
                  prev && prev.status === "WAITING"
                    ? { ...prev, amount: totalAmount }
                    : prev
                )
              }}
            />

            {contract.remarks && (
              <div className="text-sm">
                <div className="text-muted-foreground">備考</div>
                <div>{contract.remarks}</div>
              </div>
            )}
          </div>
        )}
      </section>

      <Separator />

      <section>
        <h2 className="mb-2 font-medium">進捗</h2>
        <p className="text-sm text-muted-foreground">
          現在の進捗は上部バッジで更新できます。履歴とメモは Activity Log で管理します。
        </p>
      </section>

      <ActivityLogSection logs={activityLogs} />
    </div>
  )
}
