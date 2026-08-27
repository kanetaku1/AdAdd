"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"

import { listAdvisorAssignmentsByYear } from "@/lib/data/advisor-assignments"
import { listContractMenusAcrossYear } from "@/lib/data/sponsorship"
import { listSponsorshipMenus } from "@/lib/data/sponsorship-menus"
import { getErrorMessage } from "@/lib/errors"
import type { AdvisorAssignment } from "@/types/advisor-assignment"
import type { ContractMenuAcrossYear } from "@/types/contract-menu"
import type { SponsorshipMenu } from "@/types/sponsorship-menu"

type YearCatalogContextValue = {
  advisorAssignments: (yearId: string | null) => AdvisorAssignment[]
  sponsorshipMenus: (yearId: string | null) => SponsorshipMenu[]
  contractMenusAcrossYear: (yearId: string | null) => ContractMenuAcrossYear[]
  isAdvisorAssignmentsLoading: (yearId: string) => boolean
  isSponsorshipMenusLoading: (yearId: string) => boolean
  isContractMenusAcrossYearLoading: (yearId: string) => boolean
  advisorAssignmentsError: (yearId: string) => string | null
  sponsorshipMenusError: (yearId: string) => string | null
  contractMenusAcrossYearError: (yearId: string) => string | null
  ensureAdvisorAssignments: (yearId: string) => Promise<AdvisorAssignment[]>
  ensureSponsorshipMenus: (yearId: string) => Promise<SponsorshipMenu[]>
  ensureContractMenusAcrossYear: (
    yearId: string
  ) => Promise<ContractMenuAcrossYear[]>
  setAdvisorAssignments: (yearId: string, next: AdvisorAssignment[]) => void
  setSponsorshipMenus: (yearId: string, next: SponsorshipMenu[]) => void
  setContractMenusAcrossYear: (
    yearId: string,
    next: ContractMenuAcrossYear[]
  ) => void
  invalidateContractMenusAcrossYear: (yearId: string) => void
}

const YearCatalogContext = createContext<YearCatalogContextValue | null>(null)

const EMPTY_ADVISOR_ASSIGNMENTS: AdvisorAssignment[] = []
const EMPTY_SPONSORSHIP_MENUS: SponsorshipMenu[] = []
const EMPTY_CONTRACT_MENUS: ContractMenuAcrossYear[] = []

/**
 * Session cache for year-scoped reference lists (Issue #82). Each resource
 * is fetched only when a screen first calls `ensure*`. Mutations write
 * through via the setters; detail-page contract edits invalidate the
 * across-year Contract Menu list.
 */
export function YearCatalogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [advisors, setAdvisors] = useState<Record<string, AdvisorAssignment[]>>(
    {}
  )
  const [menus, setMenus] = useState<Record<string, SponsorshipMenu[]>>({})
  const [contractMenus, setContractMenus] = useState<
    Record<string, ContractMenuAcrossYear[]>
  >({})
  const [advisorLoading, setAdvisorLoading] = useState<Record<string, boolean>>(
    {}
  )
  const [menuLoading, setMenuLoading] = useState<Record<string, boolean>>({})
  const [contractMenuLoading, setContractMenuLoading] = useState<
    Record<string, boolean>
  >({})
  const [advisorErrors, setAdvisorErrors] = useState<Record<string, string>>(
    {}
  )
  const [menuErrors, setMenuErrors] = useState<Record<string, string>>({})
  const [contractMenuErrors, setContractMenuErrors] = useState<
    Record<string, string>
  >({})

  const advisorInFlight = useRef<
    Partial<Record<string, Promise<AdvisorAssignment[]>>>
  >({})
  const menuInFlight = useRef<Partial<Record<string, Promise<SponsorshipMenu[]>>>>(
    {}
  )
  const contractMenuInFlight = useRef<
    Partial<Record<string, Promise<ContractMenuAcrossYear[]>>>
  >({})
  const advisorsRef = useRef<Record<string, AdvisorAssignment[]>>({})
  const menusRef = useRef<Record<string, SponsorshipMenu[]>>({})
  const contractMenusRef = useRef<Record<string, ContractMenuAcrossYear[]>>({})

  const ensureAdvisorAssignments = useCallback(async (yearId: string) => {
    if (yearId in advisorsRef.current) return advisorsRef.current[yearId] ?? []
    if (advisorInFlight.current[yearId]) return advisorInFlight.current[yearId]

    setAdvisorLoading((prev) => ({ ...prev, [yearId]: true }))
    setAdvisorErrors((prev) => {
      const next = { ...prev }
      delete next[yearId]
      return next
    })
    const request = (async () => {
      try {
        const list = await listAdvisorAssignmentsByYear(yearId)
        advisorsRef.current = { ...advisorsRef.current, [yearId]: list }
        setAdvisors((prev) => ({ ...prev, [yearId]: list }))
        return list
      } catch (e) {
        const message = getErrorMessage(e, {
          fallback: "アドバイザー割当の取得に失敗しました",
        })
        setAdvisorErrors((prev) => ({ ...prev, [yearId]: message }))
        throw e
      } finally {
        setAdvisorLoading((prev) => ({ ...prev, [yearId]: false }))
        delete advisorInFlight.current[yearId]
      }
    })()
    advisorInFlight.current[yearId] = request
    return request
  }, [])

  const ensureSponsorshipMenus = useCallback(async (yearId: string) => {
    if (yearId in menusRef.current) return menusRef.current[yearId] ?? []
    if (menuInFlight.current[yearId]) return menuInFlight.current[yearId]

    setMenuLoading((prev) => ({ ...prev, [yearId]: true }))
    setMenuErrors((prev) => {
      const next = { ...prev }
      delete next[yearId]
      return next
    })
    const request = (async () => {
      try {
        const list = await listSponsorshipMenus(yearId)
        menusRef.current = { ...menusRef.current, [yearId]: list }
        setMenus((prev) => ({ ...prev, [yearId]: list }))
        return list
      } catch (e) {
        const message = getErrorMessage(e, {
          fallback: "協賛メニューの取得に失敗しました",
        })
        setMenuErrors((prev) => ({ ...prev, [yearId]: message }))
        throw e
      } finally {
        setMenuLoading((prev) => ({ ...prev, [yearId]: false }))
        delete menuInFlight.current[yearId]
      }
    })()
    menuInFlight.current[yearId] = request
    return request
  }, [])

  const ensureContractMenusAcrossYear = useCallback(async (yearId: string) => {
    if (yearId in contractMenusRef.current) {
      return contractMenusRef.current[yearId] ?? []
    }
    if (contractMenuInFlight.current[yearId]) {
      return contractMenuInFlight.current[yearId]
    }

    setContractMenuLoading((prev) => ({ ...prev, [yearId]: true }))
    setContractMenuErrors((prev) => {
      const next = { ...prev }
      delete next[yearId]
      return next
    })
    const request = (async () => {
      try {
        const list = await listContractMenusAcrossYear(yearId)
        contractMenusRef.current = {
          ...contractMenusRef.current,
          [yearId]: list,
        }
        setContractMenus((prev) => ({ ...prev, [yearId]: list }))
        return list
      } catch (e) {
        const message = getErrorMessage(e, {
          fallback: "契約メニュー一覧の取得に失敗しました",
        })
        setContractMenuErrors((prev) => ({ ...prev, [yearId]: message }))
        throw e
      } finally {
        setContractMenuLoading((prev) => ({ ...prev, [yearId]: false }))
        delete contractMenuInFlight.current[yearId]
      }
    })()
    contractMenuInFlight.current[yearId] = request
    return request
  }, [])

  const setAdvisorAssignments = useCallback(
    (yearId: string, next: AdvisorAssignment[]) => {
      advisorsRef.current = { ...advisorsRef.current, [yearId]: next }
      setAdvisors((prev) => ({ ...prev, [yearId]: next }))
    },
    []
  )

  const setSponsorshipMenus = useCallback(
    (yearId: string, next: SponsorshipMenu[]) => {
      menusRef.current = { ...menusRef.current, [yearId]: next }
      setMenus((prev) => ({ ...prev, [yearId]: next }))
    },
    []
  )

  const setContractMenusAcrossYear = useCallback(
    (yearId: string, next: ContractMenuAcrossYear[]) => {
      contractMenusRef.current = {
        ...contractMenusRef.current,
        [yearId]: next,
      }
      setContractMenus((prev) => ({ ...prev, [yearId]: next }))
    },
    []
  )

  const invalidateContractMenusAcrossYear = useCallback((yearId: string) => {
    if (yearId in contractMenusRef.current) {
      const next = { ...contractMenusRef.current }
      delete next[yearId]
      contractMenusRef.current = next
    }
    setContractMenus((prev) => {
      if (!(yearId in prev)) return prev
      const next = { ...prev }
      delete next[yearId]
      return next
    })
    delete contractMenuInFlight.current[yearId]
  }, [])

  const getAdvisorAssignments = useCallback(
    (yearId: string | null) =>
      yearId ? (advisors[yearId] ?? EMPTY_ADVISOR_ASSIGNMENTS) : EMPTY_ADVISOR_ASSIGNMENTS,
    [advisors]
  )
  const getSponsorshipMenus = useCallback(
    (yearId: string | null) =>
      yearId ? (menus[yearId] ?? EMPTY_SPONSORSHIP_MENUS) : EMPTY_SPONSORSHIP_MENUS,
    [menus]
  )
  const getContractMenusAcrossYear = useCallback(
    (yearId: string | null) =>
      yearId
        ? (contractMenus[yearId] ?? EMPTY_CONTRACT_MENUS)
        : EMPTY_CONTRACT_MENUS,
    [contractMenus]
  )

  return (
    <YearCatalogContext.Provider
      value={{
        advisorAssignments: getAdvisorAssignments,
        sponsorshipMenus: getSponsorshipMenus,
        contractMenusAcrossYear: getContractMenusAcrossYear,
        isAdvisorAssignmentsLoading: (yearId) =>
          Boolean(advisorLoading[yearId]),
        isSponsorshipMenusLoading: (yearId) => Boolean(menuLoading[yearId]),
        isContractMenusAcrossYearLoading: (yearId) =>
          Boolean(contractMenuLoading[yearId]),
        advisorAssignmentsError: (yearId) => advisorErrors[yearId] ?? null,
        sponsorshipMenusError: (yearId) => menuErrors[yearId] ?? null,
        contractMenusAcrossYearError: (yearId) =>
          contractMenuErrors[yearId] ?? null,
        ensureAdvisorAssignments,
        ensureSponsorshipMenus,
        ensureContractMenusAcrossYear,
        setAdvisorAssignments,
        setSponsorshipMenus,
        setContractMenusAcrossYear,
        invalidateContractMenusAcrossYear,
      }}
    >
      {children}
    </YearCatalogContext.Provider>
  )
}

export function useYearCatalog() {
  const ctx = useContext(YearCatalogContext)
  if (!ctx) {
    throw new Error("useYearCatalog must be used within a YearCatalogProvider")
  }
  return ctx
}
