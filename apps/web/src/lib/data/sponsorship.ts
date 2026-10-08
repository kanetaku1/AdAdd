import { apiFetch, isApiEnabled, ApiError, getCurrentDevUserId } from "@/lib/api/client"
import { mockCompanies } from "@/lib/mock/companies"
import {
  addContractMenu,
  mockContractMenus,
  removeContractMenu as removeMockContractMenu,
  updateContractMenu as updateMockContractMenu,
} from "@/lib/mock/contract-menus"
import {
  addSponsorshipContract,
  mockSponsorshipContracts,
  updateContractTotalAmount,
} from "@/lib/mock/sponsorship-contracts"
import {
  mockPayments,
  updatePayment as updateMockPayment,
} from "@/lib/mock/payments"
import { mockSponsorshipMenus } from "@/lib/mock/sponsorship-menus"
import { mockUsers } from "@/lib/mock/users"
import {
  addMockActivityLog,
  listMockActivityLogs,
} from "@/lib/mock/activity-logs"
import {
  mockYearlyCompanies,
  updateAssignedMember,
  updateContactSnapshot,
} from "@/lib/mock/yearly-companies"
import { toConfirmationDate } from "@/lib/payment-labels"
import { SPONSORSHIP_PROGRESS_LABEL } from "@/lib/yearly-company-labels"
import type { ActivityLog } from "@/types/activity-log"
import type {
  ContractMenu,
  ContractMenuAcrossYear,
  ContractMenuProductionType,
  ContractMenuStatus,
} from "@/types/contract-menu"
import type { Payment, PaymentAcrossYear, PaymentStatus } from "@/types/payment"
import type { SponsorshipContract } from "@/types/sponsorship-contract"
import type {
  CompanyStatus,
  SponsorshipPhase,
  SponsorshipProgress,
  YearlyCompany,
  YearlyCompanyContact,
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

function enrichYearlyCompany(yc: YearlyCompany): YearlyCompany {
  const company = mockCompanies.find((c) => c.id === yc.companyId)
  const member = mockUsers.find((u) => u.id === yc.assignedMemberId)
  const contract = mockSponsorshipContracts.find(
    (c) => c.yearlyCompanyId === yc.id
  )
  return {
    ...yc,
    companyName: yc.companyName || company?.companyName || "(不明な企業)",
    companyNameKana: yc.companyNameKana || company?.companyNameKana || "",
    assignedMemberName: yc.assignedMemberName ?? member?.name ?? null,
    contractTotalAmount: yc.contractTotalAmount ?? contract?.totalAmount ?? null,
    notes: yc.notes ?? "",
  }
}

/** Backend joins Company name/kana and the assigned member onto the DTO (Issue #10). */
type ApiYearlyCompany = {
  id: string
  yearId: string
  companyId: string
  companyName: string
  companyNameKana?: string
  companyStatus: CompanyStatus
  phase: SponsorshipPhase
  progress: SponsorshipProgress
  assignedMemberId: string | null
  assignedMemberName: string | null
  contractTotalAmount: number | string | null
  notes?: string
  postalCode?: string
  address?: string
  phoneNumber?: string
  website?: string
  contactPersonName?: string
  contactEmailOrForm?: string
  memo?: string
}

function mapApiYearlyCompany(raw: ApiYearlyCompany): YearlyCompany {
  return {
    id: raw.id,
    yearId: raw.yearId,
    companyId: raw.companyId,
    companyName: raw.companyName,
    companyNameKana: raw.companyNameKana ?? "",
    companyStatus: raw.companyStatus,
    phase: raw.phase,
    progress: raw.progress,
    assignedMemberId: raw.assignedMemberId,
    assignedMemberName: raw.assignedMemberName,
    contractTotalAmount:
      raw.contractTotalAmount === null || raw.contractTotalAmount === undefined
        ? null
        : Number(raw.contractTotalAmount),
    notes: raw.notes ?? "",
    postalCode: raw.postalCode ?? "",
    address: raw.address ?? "",
    phoneNumber: raw.phoneNumber ?? "",
    website: raw.website ?? "",
    contactPersonName: raw.contactPersonName ?? "",
    contactEmailOrForm: raw.contactEmailOrForm ?? "",
    memo: raw.memo ?? "",
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
  driveFolderId?: string
  files?: {
    id: string
    driveUrl: string
    driveFileName: string
  }[]
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
    driveFolderId: cm.driveFolderId ?? null,
    files: cm.files?.map((f) => ({
      id: f.id,
      driveUrl: f.driveUrl,
      driveFileName: f.driveFileName,
    })) ?? [],
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

export async function listActivityLogsByYearlyCompany(
  yearlyCompanyId: string
): Promise<ActivityLog[]> {
  if (isApiEnabled()) {
    return apiFetch<ActivityLog[]>(`/yearly-companies/${yearlyCompanyId}/activity-logs`)
  }
  return listMockActivityLogs(yearlyCompanyId)
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
        driveFolderId?: string
        files?: { id: string; driveUrl: string; driveFileName: string }[]
        remarks?: string
      }>
    >(`/contracts/${contractId}/menus`)
    return list.map(mapApiContractMenu)
  }
  return mockContractMenus.filter((cm) => cm.contractId === contractId)
}

export type ContractMenuAcrossYearFilters = {
  companyName?: string
  sponsorshipMenuId?: string
  status?: ContractMenuStatus
  productionType?: ContractMenuProductionType
}

/**
 * Cross-contract view of every Contract Menu in a Year, joined with its
 * Company / Sponsorship Menu (spec/frontend.md#Contract Menu List,
 * #Ad Material Progress; spec/api.md#List Contract Menus Across a Year).
 */
export async function listContractMenusAcrossYear(
  yearId: string,
  filters: ContractMenuAcrossYearFilters = {}
): Promise<ContractMenuAcrossYear[]> {
  if (isApiEnabled()) {
    const params = new URLSearchParams()
    if (filters.companyName) params.set("companyName", filters.companyName)
    if (filters.sponsorshipMenuId)
      params.set("sponsorshipMenuId", filters.sponsorshipMenuId)
    if (filters.status) params.set("status", filters.status)
    if (filters.productionType)
      params.set("productionType", filters.productionType)
    const qs = params.toString()
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
        driveFolderId?: string
        files: {
          id: string
          driveUrl: string
          driveFileName: string
        }[]
        remarks?: string
        companyName: string
        yearlyCompanyId: string
        assignedMemberId?: string | null
        assignedMemberName?: string | null
        sponsorshipMenuName: string
      }>
    >(`/years/${yearId}/contract-menus${qs ? `?${qs}` : ""}`)
    return list.map((cm) => ({
      ...mapApiContractMenu(cm),
      companyName: cm.companyName,
      yearlyCompanyId: cm.yearlyCompanyId,
      assignedMemberId: cm.assignedMemberId ?? null,
      assignedMemberName: cm.assignedMemberName ?? null,
      sponsorshipMenuName: cm.sponsorshipMenuName,
    }))
  }

  return mockContractMenus
    .map((cm): ContractMenuAcrossYear | null => {
      const contract = mockSponsorshipContracts.find(
        (c) => c.id === cm.contractId
      )
      if (!contract) return null
      const yc = mockYearlyCompanies.find(
        (row) => row.id === contract.yearlyCompanyId
      )
      if (!yc || yc.yearId !== yearId) return null
      const menu = mockSponsorshipMenus.find(
        (m) => m.id === cm.sponsorshipMenuId
      )
      return {
        ...cm,
        companyName: yc.companyName,
        yearlyCompanyId: yc.id,
        assignedMemberId: yc.assignedMemberId ?? null,
        assignedMemberName: yc.assignedMemberName ?? null,
        sponsorshipMenuName: menu?.name ?? "(不明なメニュー)",
      }
    })
    .filter((cm): cm is ContractMenuAcrossYear => cm !== null)
    .filter(
      (cm) =>
        !filters.companyName ||
        cm.companyName.toLowerCase().includes(filters.companyName.toLowerCase())
    )
    .filter(
      (cm) =>
        !filters.sponsorshipMenuId ||
        cm.sponsorshipMenuId === filters.sponsorshipMenuId
    )
    .filter((cm) => !filters.status || cm.status === filters.status)
    .filter(
      (cm) =>
        !filters.productionType || cm.productionType === filters.productionType
    )
}

/**
 * PATCH /contract-menus/{id} (spec/api.md#Update Contract Menu) — edits
 * quantity / unitPrice / isGoodsSponsorship / productionType after creation.
 */
export async function updateContractMenu(
  id: string,
  patch: {
    quantity?: number
    unitPrice?: number
    isGoodsSponsorship?: boolean
    productionType?: ContractMenuProductionType | null
  }
): Promise<ContractMenu> {
  if (isApiEnabled()) {
    const updated = await apiFetch<{
      id: string
      contractId: string
      sponsorshipMenuId: string
      quantity: number
      unitPrice: number | string
      isGoodsSponsorship: boolean
      productionType?: string
      status: string
      driveFolderId?: string
      files?: {
        id: string
        driveUrl: string
        driveFileName: string
      }[]
      remarks?: string
    }>(`/contract-menus/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
    return mapApiContractMenu(updated)
  }

  const existing = mockContractMenus.find((cm) => cm.id === id)
  if (!existing) throw new Error("contract menu not found")

  const nextIsGoods =
    patch.isGoodsSponsorship ?? existing.isGoodsSponsorship
  const next: Partial<ContractMenu> = { ...patch }
  if (nextIsGoods) {
    next.unitPrice = 0
    next.isGoodsSponsorship = true
  }

  const updated = updateMockContractMenu(id, next)
  const siblings = mockContractMenus.filter(
    (cm) => cm.contractId === updated.contractId
  )
  const total = siblings.reduce(
    (sum, cm) => sum + cm.quantity * cm.unitPrice,
    0
  )
  updateContractTotalAmount(updated.contractId, total)
  return updated
}

/** PATCH /contract-menus/{id}/status (spec/api.md#Update Contract Menu Status). */
export async function updateContractMenuStatus(
  id: string,
  status: ContractMenuStatus
): Promise<ContractMenu> {
  if (isApiEnabled()) {
    const updated = await apiFetch<{
      id: string
      contractId: string
      sponsorshipMenuId: string
      quantity: number
      unitPrice: number | string
      isGoodsSponsorship: boolean
      productionType?: string
      status: string
      driveFolderId?: string
      files?: { id: string; driveUrl: string; driveFileName: string }[]
      remarks?: string
    }>(`/contract-menus/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
    return mapApiContractMenu(updated)
  }
  return updateMockContractMenu(id, { status })
}

/**
 * PATCH /contract-menus/{id}/production (spec/api.md#Upload Production
 * Information). Registering a Drive folder always finalizes the item —
 * the backend sets `status` to `SUBMITTED` as part of this call, it is
 * never a plain metadata edit.
 */
export async function updateContractMenuProduction(
  id: string,
  input: { driveFolderUrl: string; remarks: string }
): Promise<ContractMenu> {
  if (isApiEnabled()) {
    const updated = await apiFetch<{
      id: string
      contractId: string
      sponsorshipMenuId: string
      quantity: number
      unitPrice: number | string
      isGoodsSponsorship: boolean
      productionType?: string
      status: string
      driveFolderId?: string
      files?: { id: string; driveUrl: string; driveFileName: string }[]
      remarks?: string
    }>(`/contract-menus/${id}/production`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
    return mapApiContractMenu(updated)
  }
  return updateMockContractMenu(id, {
    files: [{ id: "mock_f_prod", driveUrl: input.driveFolderUrl, driveFileName: "確認用.pdf" }],
    remarks: input.remarks,
    status: "SUBMITTED",
  })
}

/**
 * POST /contract-menus/{id}/drive-upload - Uploads a file to Google Drive and sets production type/submits
 */
export async function uploadContractMenuToDrive(
  id: string,
  file: File,
  folderId: string,
  accessToken: string
): Promise<ContractMenu> {
  if (isApiEnabled()) {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folderId", folderId)
    formData.append("accessToken", accessToken)

    const updated = await apiFetch<{
      id: string
      contractId: string
      sponsorshipMenuId: string
      quantity: number
      unitPrice: number | string
      isGoodsSponsorship: boolean
      productionType?: string
      status: string
      driveFolderId?: string
      files?: { id: string; driveUrl: string; driveFileName: string }[]
      remarks?: string
    }>(`/contract-menus/${id}/drive-upload`, {
      method: "POST",
      body: formData,
    })
    return mapApiContractMenu(updated)
  }
  return updateMockContractMenu(id, {
    files: [{ id: "mock_f_drive", driveUrl: "http://mock.drive.url", driveFileName: "mock.pdf" }],
    status: "SUBMITTED",
  })
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
        confirmedAt: toConfirmationDate(raw.confirmedAt),
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

export type PaymentAcrossYearFilters = {
  status?: PaymentStatus
}

/**
 * Cross-contract view of every Payment in a Year, joined with its Company
 * (spec/frontend.md#Finance Management, #Dashboard; spec/api.md#List
 * Payments Across a Year).
 */
export async function listPaymentsByYear(
  yearId: string,
  filters: PaymentAcrossYearFilters = {}
): Promise<PaymentAcrossYear[]> {
  if (isApiEnabled()) {
    const params = new URLSearchParams()
    if (filters.status) params.set("status", filters.status)
    const qs = params.toString()
    const list = await apiFetch<
      Array<{
        id: string
        contractId: string
        amount: number | string
        status: string
        confirmedAt?: string | null
        confirmedById?: string | null
        confirmedByName?: string | null
        companyName: string
        companyNameKana?: string
        yearlyCompanyId: string
        assignedMemberName?: string | null
      }>
    >(`/years/${yearId}/payments${qs ? `?${qs}` : ""}`)
    return list.map((p) => ({
      id: p.id,
      contractId: p.contractId,
      amount: Number(p.amount),
      status: p.status as PaymentStatus,
      confirmedAt: toConfirmationDate(p.confirmedAt),
      confirmedById: p.confirmedById ?? null,
      confirmedByName: p.confirmedByName ?? null,
      companyName: p.companyName,
      companyNameKana: p.companyNameKana ?? "",
      yearlyCompanyId: p.yearlyCompanyId,
      assignedMemberName: p.assignedMemberName ?? null,
    }))
  }

  return mockPayments
    .map((p): PaymentAcrossYear | null => {
      const contract = mockSponsorshipContracts.find(
        (c) => c.id === p.contractId
      )
      if (!contract) return null
      const yc = mockYearlyCompanies.find(
        (row) => row.id === contract.yearlyCompanyId
      )
      if (!yc || yc.yearId !== yearId) return null
      return {
        ...p,
        companyName: yc.companyName,
        companyNameKana:
          mockCompanies.find((c) => c.id === yc.companyId)?.companyNameKana ??
          "",
        yearlyCompanyId: yc.id,
        assignedMemberName: yc.assignedMemberName,
      }
    })
    .filter((p): p is PaymentAcrossYear => p !== null)
    .filter((p) => !filters.status || p.status === filters.status)
}

/**
 * PATCH /payments/{id} (spec/api.md#Update Payment Status). confirmedAt/
 * confirmedById are set/cleared server-side from the authenticated user —
 * never sent in the request body.
 */
export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus
): Promise<Payment> {
  if (isApiEnabled()) {
    const updated = await apiFetch<{
      id: string
      contractId: string
      amount: number | string
      status: string
      confirmedAt?: string | null
      confirmedById?: string | null
    }>(`/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
    return {
      id: updated.id,
      contractId: updated.contractId,
      amount: Number(updated.amount),
      status: updated.status as PaymentStatus,
      confirmedAt: toConfirmationDate(updated.confirmedAt),
      confirmedById: updated.confirmedById ?? null,
      confirmedByName: null,
    }
  }
  const currentUserId = status === "CONFIRMED" ? getCurrentDevUserId() : null
  const currentUserName = currentUserId
    ? (mockUsers.find((u) => u.id === currentUserId)?.name ?? null)
    : null
  return updateMockPayment(id, status, currentUserId, currentUserName)
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
  addMockActivityLog({
    yearlyCompanyId,
    eventType: "ASSIGNMENT_UPDATED",
    message: userId ? "担当メンバーを更新" : "担当メンバーを未割当に変更",
  })
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
  if (yc) {
    yc.progress = progress
    addMockActivityLog({
      yearlyCompanyId,
      eventType: "PROGRESS_UPDATED",
      message: `進捗を「${SPONSORSHIP_PROGRESS_LABEL[progress]}」に更新`,
    })
  }
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

export async function updateYearlyCompanyContact(
  yearlyCompanyId: string,
  contact: YearlyCompanyContact
): Promise<YearlyCompany> {
  if (isApiEnabled()) {
    const raw = await apiFetch<ApiYearlyCompany>(
      `/yearly-companies/${yearlyCompanyId}/company-contact`,
      {
        method: "PATCH",
        body: JSON.stringify(contact),
      }
    )
    return mapApiYearlyCompany(raw)
  }
  const yc = updateContactSnapshot(yearlyCompanyId, contact)
  if (!yc) {
    throw new Error("yearly company not found")
  }
  const company = mockCompanies.find((c) => c.id === yc.companyId)
  if (company) {
    company.postalCode = contact.postalCode
    company.address = contact.address
    company.phoneNumber = contact.phoneNumber
    company.website = contact.website
    company.contactPersonName = contact.contactPersonName
    company.contactEmailOrForm = contact.contactEmailOrForm
    company.memo = contact.memo
    company.updatedAt = new Date().toISOString()
  }
  return enrichYearlyCompany(yc)
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
  addMockActivityLog({
    yearlyCompanyId,
    eventType: "CONTRACT_CREATED",
    message: `契約を作成（合計: ¥${previewTotal.toLocaleString("ja-JP")}）`,
  })

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
      driveFolderId: null,
      files: [],
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
      files?: { id: string; driveUrl: string; driveFileName: string }[]
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
    driveFolderId: null,
    files: [],
    remarks: "",
  }
  addContractMenu(menu)
  const menus = mockContractMenus.filter((cm) => cm.contractId === contractId)
  const total = menus.reduce((sum, cm) => sum + cm.quantity * cm.unitPrice, 0)
  updateContractTotalAmount(contractId, total)
  return menu
}

/**
 * DELETE /contract-menus/{id} (spec/api.md#Delete Contract Menu) — removes a
 * Contract Menu and recalculates the parent Contract's totalAmount.
 * Administrator only; callers must gate the action with
 * `canAccess(roles, ["ADMINISTRATOR"])` to match the backend's RequireRoles.
 */
export async function deleteContractMenu(id: string): Promise<void> {
  if (isApiEnabled()) {
    await apiFetch(`/contract-menus/${id}`, { method: "DELETE" })
    return
  }
  const removed = removeMockContractMenu(id)
  if (!removed) return
  const remaining = mockContractMenus.filter(
    (cm) => cm.contractId === removed.contractId
  )
  const total = remaining.reduce(
    (sum, cm) => sum + cm.quantity * cm.unitPrice,
    0
  )
  updateContractTotalAmount(removed.contractId, total)
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

export async function deleteContractMenuFile(
  menuId: string,
  fileId: string,
  accessToken?: string
): Promise<void> {
  if (!isApiEnabled()) {
    const menu = mockContractMenus.find((cm) => cm.id === menuId)
    if (menu) {
      menu.files = menu.files.filter((f) => f.id !== fileId)
    }
    return
  }
  let url = `/contract-menus/${menuId}/files/${fileId}`
  if (accessToken) {
    url += `?accessToken=${encodeURIComponent(accessToken)}`
  }
  await apiFetch(url, {
    method: "DELETE",
  })
}
