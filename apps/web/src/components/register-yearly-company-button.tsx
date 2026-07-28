"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/query-state"
import { useCurrentUser } from "@/components/current-user-provider"
import { registerCompanyToYear } from "@/lib/data/years"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"

const ALLOWED_ROLES = ["SPONSORSHIP_MEMBER", "ADMINISTRATOR"]

/**
 * Client-state wrapper for the Company List's per-row "register into the
 * active Year" action (spec/usecase.md UC-01 Notes — individual, mid-cycle
 * registration path) so the (server) Companies page doesn't itself need to
 * become a client component. Connected to POST /years/{yearId}/companies via
 * lib/data/years.ts (Issue #18) — same API/mock mode switch as the rest of
 * the app, so this no longer silently writes to mock data in API mode.
 */
export function RegisterYearlyCompanyButton({
  companyId,
  yearId,
  yearName,
  initiallyRegistered,
}: {
  companyId: string
  yearId: string
  yearName: string
  initiallyRegistered: boolean
}) {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const [registered, setRegistered] = useState(initiallyRegistered)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (registered || !canAccess(currentUser?.roles, ALLOWED_ROLES)) return null

  async function handleClick() {
    setSubmitting(true)
    setError(null)
    try {
      await registerCompanyToYear(companyId, yearId)
      setRegistered(true)
      router.refresh()
    } catch (e) {
      setError(getErrorMessage(e, { fallback: "登録に失敗しました" }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={submitting}
      >
        {submitting ? "登録中…" : `${yearName}年度に登録`}
      </Button>
      <ErrorBanner message={error} />
    </div>
  )
}
