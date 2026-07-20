"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import { listYears } from "@/lib/data/years"
import type { Year } from "@/types/year"

type ActiveYearContextValue = {
  years: Year[]
  activeYear: Year | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const ActiveYearContext = createContext<ActiveYearContextValue | null>(null)

/**
 * Loads every Year once (GET /years) and derives the active Year, so every
 * screen shares one fetch instead of re-deriving it from mock data (Issue
 * #18). Call `refresh()` after creating a Year so all consumers re-scope to
 * the new active Year immediately.
 */
export function ActiveYearProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [years, setYears] = useState<Year[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listYears()
      setYears(list)
    } catch (e) {
      setYears([])
      setError(e instanceof Error ? e.message : "年度の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function load() {
      await refresh()
    }
    void load()
  }, [refresh])

  const activeYear = years.find((y) => y.isActive) ?? null

  return (
    <ActiveYearContext.Provider
      value={{ years, activeYear, loading, error, refresh }}
    >
      {children}
    </ActiveYearContext.Provider>
  )
}

export function useActiveYear() {
  const ctx = useContext(ActiveYearContext)
  if (!ctx) {
    throw new Error("useActiveYear must be used within an ActiveYearProvider")
  }
  return ctx
}
