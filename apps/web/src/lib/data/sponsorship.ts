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
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import { mockPayments } from "@/lib/mock/payments"
import { mockUsers } from "@/lib/mock/users"
import {
  mockYearlyCompanies,
  updateAssignedMember,
} from "@/lib/mock/yearly-companies"
import type { Company } from "@/types/company"
import type { ContractMenu } from "@/types/contract-menu"
import type { Payment } from "@/types/payment"
import type { SponsorshipContract } from "@/types/sponsorship-contract"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"
import type { User } from "@/types/user"
import type {
  CompanyStatus,
  SponsorshipPhase,
  SponsorshipProgress,
  YearlyCompany,
} from "@/types/yearly-company"
import type { ContractMenuItemValue } from "@/components/contract-menu-item-fields"

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

/** Backend YearlyCompany model lacks joined display fields. */
type ApiYearlyCompany = {
  id: string
  yearId: string
  companyId: string
  companyStatus: CompanyStatus
  phase: SponsorshipPhase
  progress: SponsorshipProgress
  notes?: string
}

async function mapApiYearlyCompany(raw: ApiYearlyCompany): Promise<YearlyCompany> {
  let companyName = "(不明な企業)"
  const assignedMemberId: string | null = null
  const assignedMemberName: string | null = null

  try {
    const company = await apiFetch<Company>(`/companies/${raw.companyId}`)
    companyName = company.companyName
  } catch {
    const local = mockCompanies.find((c) => c.id === raw.companyId)
    if (local) companyName = local.companyName
  }

  try {
    // List assignments via me/companies is wrong shape; use mock join for name
    // until list response includes assignee. Assignment is fetched separately
    // only on detail when needed.
  } catch {
    /* ignore */
  }

  return {
    id: raw.id,
    yearId: raw.yearId,
    companyId: raw.companyId,
    companyName,
    companyStatus: raw.companyStatus,
    phase: raw.phase,
    progress: raw.progress,
    assignedMemberId,
    assignedMemberName,
    notes: raw.notes ?? "",
  }
}

export async function listYearlyCompaniesByYear(
  yearId: string
): Promise<YearlyCompany[]> {
  if (isApiEnabled()) {
    try {
      const list = await apiFetch<ApiYearlyCompany[]>(
        `/years/${yearId}/companies`
      )
      return Promise.all(list.map(mapApiYearlyCompany))
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 0)) {
        console.warn("listYearlyCompaniesByYear API failed, using mock", err)
      }
    }
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
      const mapped = await mapApiYearlyCompany(raw)
      // Prefer assignment from local mock enrichment if API has assignment endpoint data
      const local = mockYearlyCompanies.find((yc) => yc.id === id)
      if (local) {
        mapped.assignedMemberId = local.assignedMemberId
        mapped.assignedMemberName = local.assignedMemberName
      }
      return mapped
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      console.warn("getYearlyCompany API failed, using mock", err)
    }
  }
  const yc = mockYearlyCompanies.find((row) => row.id === id)
  return yc ? enrichYearlyCompany(yc) : null
}

export async function getCompany(id: string): Promise<Company | null> {
  if (isApiEnabled()) {
    try {
      return await apiFetch<Company>(`/companies/${id}`)
    } catch (err) {
      console.warn("getCompany API failed, using mock", err)
    }
  }
  return mockCompanies.find((c) => c.id === id) ?? null
}

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
      const assignee = mockUsers.find((u) => u.id === raw.assigneeId)
      return {
        id: raw.id,
        yearlyCompanyId: raw.yearlyCompanyId,
        contractDate: (raw.contractDate ?? "").toString().slice(0, 10),
        totalAmount: Number(raw.totalAmount),
        assigneeId: raw.assigneeId ?? null,
        assigneeName: assignee?.name ?? null,
        remarks: raw.remarks ?? "",
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      console.warn("getContractByYearlyCompany API failed, using mock", err)
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
    try {
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
      return list.map((cm) => ({
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
      }))
    } catch (err) {
      console.warn("listContractMenus API failed, using mock", err)
    }
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
      const confirmedBy = mockUsers.find((u) => u.id === raw.confirmedById)
      return {
        id: raw.id,
        contractId: raw.contractId,
        amount: Number(raw.amount),
        status: raw.status as Payment["status"],
        confirmedAt: raw.confirmedAt ?? null,
        confirmedById: raw.confirmedById ?? null,
        confirmedByName: confirmedBy?.name ?? null,
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      console.warn("getPaymentByContract API failed, using mock", err)
    }
  }
  return mockPayments.find((p) => p.contractId === contractId) ?? null
}

export async function listSponsorshipMenus(
  yearId: string
): Promise<SponsorshipMenu[]> {
  if (isApiEnabled()) {
    try {
      return await apiFetch<SponsorshipMenu[]>(
        `/years/${yearId}/sponsorship-menus`
      )
    } catch (err) {
      console.warn("listSponsorshipMenus API failed, using mock", err)
    }
  }
  return mockSponsorshipMenus.filter((m) => m.yearId === yearId)
}

export async function listUsers(): Promise<User[]> {
  if (isApiEnabled()) {
    try {
      return await apiFetch<User[]>(`/users`)
    } catch (err) {
      console.warn("listUsers API failed, using mock", err)
    }
  }
  return mockUsers
}

export async function assignMember(
  yearlyCompanyId: string,
  userId: string | null
): Promise<void> {
  if (isApiEnabled()) {
    try {
      await apiFetch(`/yearly-companies/${yearlyCompanyId}/assignments`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      })
      return
    } catch (err) {
      console.warn("assignMember API failed, using mock", err)
    }
  }
  updateAssignedMember(yearlyCompanyId, userId)
}

export async function updateYearlyCompanyProgress(
  yearlyCompanyId: string,
  progress: SponsorshipProgress
): Promise<void> {
  if (isApiEnabled()) {
    try {
      await apiFetch(`/yearly-companies/${yearlyCompanyId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ progress }),
      })
      return
    } catch (err) {
      console.warn("updateYearlyCompanyProgress API failed, using mock", err)
    }
  }
  const yc = mockYearlyCompanies.find((row) => row.id === yearlyCompanyId)
  if (yc) yc.progress = progress
}

export async function updateYearlyCompanyStatus(
  yearlyCompanyId: string,
  companyStatus: CompanyStatus
): Promise<void> {
  if (isApiEnabled()) {
    try {
      await apiFetch(`/yearly-companies/${yearlyCompanyId}/company-status`, {
        method: "PATCH",
        body: JSON.stringify({ companyStatus }),
      })
      return
    } catch (err) {
      console.warn("updateYearlyCompanyStatus API failed, using mock", err)
    }
  }
  const yc = mockYearlyCompanies.find((row) => row.id === yearlyCompanyId)
  if (yc) yc.companyStatus = companyStatus
}

export async function updateYearlyCompanyPhase(
  yearlyCompanyId: string,
  phase: SponsorshipPhase
): Promise<void> {
  if (isApiEnabled()) {
    try {
      await apiFetch(`/yearly-companies/${yearlyCompanyId}/phase`, {
        method: "PATCH",
        body: JSON.stringify({ phase }),
      })
      return
    } catch (err) {
      console.warn("updateYearlyCompanyPhase API failed, using mock", err)
    }
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
    try {
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

      return {
        id: contract.id,
        yearlyCompanyId: contract.yearlyCompanyId,
        contractDate: (contract.contractDate ?? input.contractDate)
          .toString()
          .slice(0, 10),
        totalAmount: Number(contract.totalAmount),
        assigneeId: contract.assigneeId ?? null,
        assigneeName: null,
        remarks: contract.remarks ?? input.remarks,
      }
    } catch (err) {
      console.warn("createContractWithMenus API failed, using mock", err)
    }
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
    try {
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
      return {
        id: created.id,
        contractId: created.contractId,
        sponsorshipMenuId: created.sponsorshipMenuId,
        quantity: created.quantity,
        unitPrice: Number(created.unitPrice),
        isGoodsSponsorship: created.isGoodsSponsorship,
        productionType:
          (created.productionType as ContractMenu["productionType"]) ?? null,
        status: created.status as ContractMenu["status"],
        driveUrl: created.driveUrl ?? null,
        remarks: created.remarks ?? "",
      }
    } catch (err) {
      console.warn("addContractMenuToContract API failed, using mock", err)
    }
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
    try {
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
    } catch (err) {
      console.warn("createPayment API failed, using mock", err)
      throw err
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
