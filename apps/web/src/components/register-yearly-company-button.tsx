"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { registerCompanyToYear } from "@/lib/mock/years"

/**
 * Client-state wrapper for the Company List's per-row "register into the
 * active Year" action (spec/usecase.md UC-01 Notes — individual, mid-cycle
 * registration path) so the (server) Companies page doesn't itself need to
 * become a client component.
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
  const [registered, setRegistered] = useState(initiallyRegistered)

  if (registered) return null

  function handleClick() {
    registerCompanyToYear(companyId, yearId)
    setRegistered(true)
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      {yearName}年度に登録
    </Button>
  )
}
