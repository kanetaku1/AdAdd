import { apiFetch, isApiEnabled, ApiError } from "@/lib/api/client"
import { mockCompanies } from "@/lib/mock/companies"
import {
  addContractMenu,
  mockContractMenus,
} from "@/lib/mock/contract-menus"
import {
  addSponsorshipContract,
  mockSponsorshipContracts,
  updateContractTotalAmount,
} from "@/lib/mock/sponsorship-contracts"
import { mockPayments } from "@/lib/mock/payments"
import { mockUsers } from "@/lib/mock/users"
import {
  mockYearlyCompanies,
  updateAssignedMember,
} from "@/lib/mock/yearly-companies"
import type { ContractMenu } from "@/types/contract-menu"
import type { Payment } from "@/types/payment"
import type { SponsorshipContract } from "@/types/sponsorship-contract"
import type {
  CompanyStatus,
  SponsorshipPhase,
  SponsorshipProgress,
  YearlyCompany,
} from "@/types/yearly-company"
import type { ContractMenuItemValue } from "@/components/contract-menu-item-fields"

/**
 * Data access for sponsorship domain.
 *
 * Modes (Issue #17):
 * - API mode (`NEXT_PUBLIC_API_BASE_URL` set): MySQL/API only. Errors propagate.
 * - Mock mode (env unset): in-memory mock data for local UI development.
 *
 * Never fall back from API failures to mock reads/writes.
 */

function enrichYearlyCompany(yc: YearlyCompany & { notes?: string }): YearlyCompany {
  const company = mockCompanies.find((c) => c.id === yc.companyId)
  const member = mockUsers.find((u) => u.id === yc.assignedMemberId)
  return {
    ...yc,
    companyName: yc.companyName || company?.companyName || "(不明な企業)",
    assignedMemberName:
      yc.assignedMemberName ?? member?.name ?? null,
    notes: yc.notes ?? "",
  }
}

/** Backend joins Company name and the assigned member onto the DTO (Issue #10). */
type ApiYearlyCompany = {
  id: string
  yearId: string
  companyId: string
  companyName: string
  companyStatus: CompanyStatus
  phase: SponsorshipPhase
  progress: SponsorshipProgress
  assignedMemberId: string | null
  assignedMemberName: string | null
  notes?: string
}

function mapApiYearlyCompany(raw: ApiYearlyCompany): YearlyCompany {
  return {
    id: raw.id,
    yearId: raw.yearId,
    companyId: raw.companyId,
    companyName: raw.companyName,
    companyStatus: raw.companyStatus,
    phase: raw.phase,
    progress: raw.progress,
    assignedMemberId: raw.assignedMemberId,
    assignedMemberName: raw.assignedMemberName,
    notes: raw.notes ?? "",
  }
}

function mapApiContract(raw: {
  id: string
  yearlyCompanyId: string
  contractDate?: string
  totalAmount: number | string
  assigneeId?: string
  remarks?: string
}): SponsorshipContract {
  return {
    id: raw.id,
    yearlyCompanyId: raw.yearlyCompanyId,
    contractDate: (raw.contractDate ?? "").toString().slice(0, 10),
    totalAmount: Number(raw.totalAmount),
    assigneeId: raw.assigneeId ?? null,
    assigneeName: null,
    remarks: raw.remarks ?? "",
  }
}

function mapApiContractMenu(cm: {
  id: string
  contractId: string
  sponsorshipMenuId: string
  quantity: number
  unitPrice: number | string
  isGoodsSponsorship: boolean
  productionType?: string
  status: string
  driveUrl?: string
  remarks?: string
}): ContractMenu {
  return {
    id: cm.id,
    contractId: cm.contractId,
    sponsorshipMenuId: cm.sponsorshipMenuId,
    quantity: cm.quantity,
    unitPrice: Number(cm.unitPrice),
    isGoodsSponsorship: cm.isGoodsSponsorship,
    productionType:
      (cm.productionType as ContractMenu["productionType"]) ?? null,
    status: cm.status as ContractMenu["status"],
    driveUrl: cm.driveUrl ?? null,
    remarks: cm.remarks ?? "",
  }
}

export async function listYearlyCompaniesByYear(
  yearId: string
): Promise<YearlyCompany[]> {
  if (isApiEnabled()) {
    const list = await apiFetch<ApiYearlyCompany[]>(
      `/years/${yearId}/companies`
    )
    return list.map(mapApiYearlyCompany)
  }
  return mockYearlyCompanies
    .filter((yc) => yc.yearId === yearId)
    .map(enrichYearlyCompany)
}

export async function getYearlyCompany(
  id: string
): Promise<YearlyCompany | null> {
  if (isApiEnabled()) {
    try {
      const raw = await apiFetch<ApiYearlyCompany>(`/yearly-companies/${id}`)
      return mapApiYearlyCompany(raw)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }
  const yc = mockYearlyCompanies.find((row) => row.id === id)
  return yc ? enrichYearlyCompany(yc) : null
}

export { getCompany } from "@/lib/data/companies"

export async function getContractByYearlyCompany(
  yearlyCompanyId: string
): Promise<SponsorshipContract | null> {
  if (isApiEnabled()) {
    try {
      const raw = await apiFetch<{
        id: string
        yearlyCompanyId: string
        contractDate?: string
        totalAmount: number | string
        assigneeId?: string
        remarks?: string
      }>(`/yearly-companies/${yearlyCompanyId}/contract`)
      return mapApiContract(raw)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }
  return (
    mockSponsorshipContracts.find(
      (c) => c.yearlyCompanyId === yearlyCompanyId
    ) ?? null
  )
}

export async function listContractMenus(
  contractId: string
): Promise<ContractMenu[]> {
  if (isApiEnabled()) {
    const list = await apiFetch<
      Array<{
        id: string
        contractId: string
        sponsorshipMenuId: string
        quantity: number
        unitPrice: number | string
        isGoodsSponsorship: boolean
        productionType?: string
        status: string
        driveUrl?: string
        remarks?: string
      }>
    >(`/contracts/${contractId}/menus`)
    return list.map(mapApiContractMenu)
  }
  return mockContractMenus.filter((cm) => cm.contractId === contractId)
}

export async function getPaymentByContract(
  contractId: string
): Promise<Payment | null> {
  if (isApiEnabled()) {
    try {
      const raw = await apiFetch<{
        id: string
        contractId: string
        amount: number | string
        status: string
        confirmedAt?: string | null
        confirmedById?: string | null
      }>(`/contracts/${contractId}/payment`)
      return {
        id: raw.id,
        contractId: raw.contractId,
        amount: Number(raw.amount),
        status: raw.status as Payment["status"],
        confirmedAt: raw.confirmedAt ?? null,
        confirmedById: raw.confirmedById ?? null,
        confirmedByName: null,
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }
  return mockPayments.find((p) => p.contractId === contractId) ?? null
}

export { listSponsorshipMenus } from "@/lib/data/sponsorship-menus"

export { listUsers } from "@/lib/data/users"

export async function assignMember(
  yearlyCompanyId: string,
  userId: string | null
): Promise<void> {
  if (isApiEnabled()) {
    await apiFetch(`/yearly-companies/${yearlyCompanyId}/assignments`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    })
    return
  }
  updateAssignedMember(yearlyCompanyId, userId)
}

export async function updateYearlyCompanyProgress(
  yearlyCompanyId: string,
  progress: SponsorshipProgress
): Promise<void> {
  if (isApiEnabled()) {
    await apiFetch(`/yearly-companies/${yearlyCompanyId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ progress }),
    })
    return
  }
  const yc = mockYearlyCompanies.find((row) => row.id === yearlyCompanyId)
  if (yc) yc.progress = progress
}

export async function updateYearlyCompanyStatus(
  yearlyCompanyId: string,
  companyStatus: CompanyStatus
): Promise<void> {
  if (isApiEnabled()) {
    await apiFetch(`/yearly-companies/${yearlyCompanyId}/company-status`, {
      method: "PATCH",
      body: JSON.stringify({ companyStatus }),
    })
    return
  }
  const yc = mockYearlyCompanies.find((row) => row.id === yearlyCompanyId)
  if (yc) yc.companyStatus = companyStatus
}

export async function updateYearlyCompanyPhase(
  yearlyCompanyId: string,
  phase: SponsorshipPhase
): Promise<void> {
  if (isApiEnabled()) {
    await apiFetch(`/yearly-companies/${yearlyCompanyId}/phase`, {
      method: "PATCH",
      body: JSON.stringify({ phase }),
    })
    return
  }
  const yc = mockYearlyCompanies.find((row) => row.id === yearlyCompanyId)
  if (yc) yc.phase = phase
}

export async function createContractWithMenus(
  yearlyCompanyId: string,
  input: {
    contractDate: string
    remarks: string
    items: ContractMenuItemValue[]
  }
): Promise<SponsorshipContract> {
  const previewTotal = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  if (isApiEnabled()) {
    const contract = await apiFetch<{
      id: string
      yearlyCompanyId: string
      contractDate?: string
      totalAmount: number | string
      assigneeId?: string
      remarks?: string
    }>(`/yearly-companies/${yearlyCompanyId}/contract`, {
      method: "POST",
      body: JSON.stringify({
        contractDate: input.contractDate,
        totalAmount: previewTotal,
        remarks: input.remarks,
      }),
    })

    for (const item of input.items) {
      if (!item.sponsorshipMenuId) continue
      await apiFetch(`/contracts/${contract.id}/menus`, {
        method: "POST",
        body: JSON.stringify({
          sponsorshipMenuId: item.sponsorshipMenuId,
          quantity: item.quantity,
          unitPrice: item.isGoodsSponsorship ? 0 : item.unitPrice,
          isGoodsSponsorship: item.isGoodsSponsorship,
          productionType: item.productionType,
        }),
      })
    }

    const refreshed = await getContractByYearlyCompany(yearlyCompanyId)
    if (refreshed) return refreshed

    return mapApiContract({
      ...contract,
      contractDate: contract.contractDate ?? input.contractDate,
      remarks: contract.remarks ?? input.remarks,
    })
  }

  const yc = mockYearlyCompanies.find((row) => row.id === yearlyCompanyId)
  const contractId = crypto.randomUUID()
  const contract: SponsorshipContract = {
    id: contractId,
    yearlyCompanyId,
    contractDate: input.contractDate,
    totalAmount: previewTotal,
    assigneeId: yc?.assignedMemberId ?? null,
    assigneeName: yc?.assignedMemberName ?? null,
    remarks: input.remarks,
  }
  addSponsorshipContract(contract)
  if (yc) yc.progress = "CONFIRMED"

  for (const item of input.items) {
    if (!item.sponsorshipMenuId) continue
    const menu: ContractMenu = {
      id: crypto.randomUUID(),
      contractId,
      sponsorshipMenuId: item.sponsorshipMenuId,
      quantity: item.quantity,
      unitPrice: item.isGoodsSponsorship ? 0 : item.unitPrice,
      isGoodsSponsorship: item.isGoodsSponsorship,
      productionType: item.productionType,
      status: "WAITING",
      driveUrl: null,
      remarks: "",
    }
    addContractMenu(menu)
  }
  updateContractTotalAmount(contractId, previewTotal)
  return contract
}

export async function addContractMenuToContract(
  contractId: string,
  item: ContractMenuItemValue
): Promise<ContractMenu> {
  if (isApiEnabled()) {
    const created = await apiFetch<{
      id: string
      contractId: string
      sponsorshipMenuId: string
      quantity: number
      unitPrice: number | string
      isGoodsSponsorship: boolean
      productionType?: string
      status: string
      driveUrl?: string
      remarks?: string
    }>(`/contracts/${contractId}/menus`, {
      method: "POST",
      body: JSON.stringify({
        sponsorshipMenuId: item.sponsorshipMenuId,
        quantity: item.quantity,
        unitPrice: item.isGoodsSponsorship ? 0 : item.unitPrice,
        isGoodsSponsorship: item.isGoodsSponsorship,
        productionType: item.productionType,
      }),
    })
    return mapApiContractMenu(created)
  }

  const menu: ContractMenu = {
    id: crypto.randomUUID(),
    contractId,
    sponsorshipMenuId: item.sponsorshipMenuId,
    quantity: item.quantity,
    unitPrice: item.isGoodsSponsorship ? 0 : item.unitPrice,
    isGoodsSponsorship: item.isGoodsSponsorship,
    productionType: item.productionType,
    status: "WAITING",
    driveUrl: null,
    remarks: "",
  }
  addContractMenu(menu)
  const menus = mockContractMenus.filter((cm) => cm.contractId === contractId)
  const total = menus.reduce((sum, cm) => sum + cm.quantity * cm.unitPrice, 0)
  updateContractTotalAmount(contractId, total)
  return menu
}

export async function createPayment(contractId: string): Promise<Payment> {
  if (isApiEnabled()) {
    const raw = await apiFetch<{
      id: string
      contractId: string
      amount: number | string
      status: string
    }>(`/contracts/${contractId}/payment`, { method: "POST", body: "{}" })
    return {
      id: raw.id,
      contractId: raw.contractId,
      amount: Number(raw.amount),
      status: raw.status as Payment["status"],
      confirmedAt: null,
      confirmedById: null,
      confirmedByName: null,
    }
  }

  const contract = mockSponsorshipContracts.find((c) => c.id === contractId)
  if (!contract || contract.totalAmount <= 0) {
    throw new Error("cannot create payment for zero total amount")
  }
  if (mockPayments.some((p) => p.contractId === contractId)) {
    throw new Error("payment already exists")
  }
  const payment: Payment = {
    id: crypto.randomUUID(),
    contractId,
    amount: contract.totalAmount,
    status: "WAITING",
    confirmedAt: null,
    confirmedById: null,
    confirmedByName: null,
  }
  mockPayments.push(payment)
  return payment
}
