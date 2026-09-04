"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"

import { ApiError } from "@/lib/api/client"
import { listUsers } from "@/lib/data/users"
import { getErrorMessage } from "@/lib/errors"
import type { User } from "@/types/user"

type UsersContextValue = {
  users: User[]
  loading: boolean
  error: string | null
  ensureUsers: () => Promise<User[]>
  refresh: () => Promise<User[]>
  setUsers: Dispatch<SetStateAction<User[]>>
}

const UsersContext = createContext<UsersContextValue | null>(null)

function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}

/**
 * Shares `GET /users` across screens that need the User list (Issue #82).
 * Lazy: does not fetch on mount. `GET /users` is Administrator-only, so a
 * 403 is treated as an empty list rather than failing the page.
 */
export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef<Promise<User[]> | null>(null)
  const usersRef = useRef<User[]>([])
  const loadedRef = useRef(false)

  const fetchUsers = useCallback(async (force: boolean): Promise<User[]> => {
    if (!force && loadedRef.current) return usersRef.current
    if (inFlight.current) return inFlight.current

    setLoading(true)
    setError(null)
    const request = (async () => {
      try {
        const list = await listUsers()
        usersRef.current = list
        loadedRef.current = true
        setUsers(list)
        return list
      } catch (e) {
        if (isForbidden(e)) {
          usersRef.current = []
          loadedRef.current = true
          setUsers([])
          setError(null)
          return []
        }
        const message = getErrorMessage(e, {
          fallback: "ユーザー一覧の取得に失敗しました",
        })
        setError(message)
        throw e
      } finally {
        setLoading(false)
        inFlight.current = null
      }
    })()
    inFlight.current = request
    return request
  }, [])

  const ensureUsers = useCallback(() => fetchUsers(false), [fetchUsers])
  const refresh = useCallback(() => fetchUsers(true), [fetchUsers])

  const setUsersAndRef = useCallback<Dispatch<SetStateAction<User[]>>>(
    (action) => {
      setUsers((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        usersRef.current = next
        return next
      })
    },
    []
  )

  return (
    <UsersContext.Provider
      value={{
        users,
        loading,
        error,
        ensureUsers,
        refresh,
        setUsers: setUsersAndRef,
      }}
    >
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) {
    throw new Error("useUsers must be used within a UsersProvider")
  }
  return ctx
}
