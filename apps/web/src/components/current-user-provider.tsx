"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import { getCurrentUser, type CurrentUser } from "@/lib/data/users"

type CurrentUserContextValue = {
  currentUser: CurrentUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

/**
 * Resolves the signed-in User + Role codes once (GET /users/me) and shares
 * it app-wide, same pattern as ActiveYearProvider — so Navigation Structure
 * (Issue #23) can gate on `currentUser.roles` without every page fetching
 * it separately. `currentUser` is `null` both while loading and when
 * nobody is logged in (mock mode, or no session) — check `loading` to
 * distinguish the two.
 */
export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      setCurrentUser(user)
    } catch {
      setCurrentUser(null)
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

  return (
    <CurrentUserContext.Provider value={{ currentUser, loading, refresh }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider")
  }
  return ctx
}
