"use client"

import { useCallback, useRef, useState } from "react"
import { getErrorMessage } from "@/lib/errors"

export type ResourceCache<T> = {
  data: (yearId: string | null) => T[]
  isLoading: (yearId: string) => boolean
  error: (yearId: string) => string | null
  ensure: (yearId: string) => Promise<T[]>
  set: (yearId: string, next: T[]) => void
  invalidate: (yearId: string) => void
}

const EMPTY: never[] = []

export function useResourceCache<T>(
  fetcher: (yearId: string) => Promise<T[]>,
  errorFallback: string
): ResourceCache<T> {
  const [store, setStore] = useState<Record<string, T[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const storeRef = useRef<Record<string, T[]>>({})
  const inFlight = useRef<Partial<Record<string, Promise<T[]>>>>({})

  const ensure = useCallback(
    async (yearId: string) => {
      if (yearId in storeRef.current) return storeRef.current[yearId] ?? []
      if (inFlight.current[yearId]) return inFlight.current[yearId]

      setLoading((prev) => ({ ...prev, [yearId]: true }))
      setErrors((prev) => {
        const next = { ...prev }
        delete next[yearId]
        return next
      })
      const request = (async () => {
        try {
          const list = await fetcher(yearId)
          storeRef.current = { ...storeRef.current, [yearId]: list }
          setStore((prev) => ({ ...prev, [yearId]: list }))
          return list
        } catch (e) {
          const message = getErrorMessage(e, { fallback: errorFallback })
          setErrors((prev) => ({ ...prev, [yearId]: message }))
          throw e
        } finally {
          setLoading((prev) => ({ ...prev, [yearId]: false }))
          delete inFlight.current[yearId]
        }
      })()
      inFlight.current[yearId] = request
      return request
    },
    [fetcher, errorFallback]
  )

  const set = useCallback((yearId: string, next: T[]) => {
    storeRef.current = { ...storeRef.current, [yearId]: next }
    setStore((prev) => ({ ...prev, [yearId]: next }))
  }, [])

  const invalidate = useCallback((yearId: string) => {
    if (yearId in storeRef.current) {
      const next = { ...storeRef.current }
      delete next[yearId]
      storeRef.current = next
    }
    setStore((prev) => {
      if (!(yearId in prev)) return prev
      const next = { ...prev }
      delete next[yearId]
      return next
    })
    delete inFlight.current[yearId]
  }, [])

  const data = useCallback(
    (yearId: string | null) =>
      yearId ? (store[yearId] ?? EMPTY) : EMPTY,
    [store]
  )

  const isLoading = useCallback(
    (yearId: string) => Boolean(loading[yearId]),
    [loading]
  )

  const getError = useCallback(
    (yearId: string) => errors[yearId] ?? null,
    [errors]
  )

  return { data, isLoading, error: getError, ensure, set, invalidate }
}
