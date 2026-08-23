"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { IconActionButton } from "@/components/icon-action-button"
import { useCurrentUser } from "@/components/current-user-provider"
import { canAccess } from "@/lib/auth/roles"

const ALLOWED_ROLES = ["SPONSORSHIP_MEMBER", "ADMINISTRATOR"]

/**
 * "企業を登録" entry point, split out of companies/page.tsx (a Server
 * Component) so it can check the signed-in User's roles client-side —
 * matches company_handler.go's create/update Company permission (Issue #23).
 */
export function CreateCompanyButton() {
  const { currentUser } = useCurrentUser()
  if (!canAccess(currentUser?.roles, ALLOWED_ROLES)) return null

  return (
    <IconActionButton
      label="企業を登録"
      variant="default"
      render={<Link href="/companies/new" />}
    >
      <Plus />
    </IconActionButton>
  )
}
