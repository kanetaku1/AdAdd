"use client"

import { useState } from "react"

import { getMyScopeMemberIds } from "@/lib/assignment-scope"
import type { AdvisorAssignment } from "@/types/advisor-assignment"

/**
 * Scopes a list to the signed-in User's own assignment, plus — for a
 * Sponsorship Advisor — every Member they supervise (`AdvisorAssignment`;
 * spec/domain.md Rule 9, an Advisor is never assigned directly). Defaults to
 * the scoped view only when the User has a stake in `items`, otherwise falls
 * back to the unscoped view (spec/frontend.md#Ad Material Progress). Used by
 * the Ad Material Progress follow-up list's 自分の担当のみ/全件 toggle.
 */
export function useMyAssignmentScope<T>(
  items: T[],
  getMemberId: (item: T) => string | null,
  advisorAssignments: AdvisorAssignment[],
  currentUserId: string | null
) {
  const [scopeOverride, setScopeOverride] = useState<boolean | null>(null)

  const myScopeMemberIds = getMyScopeMemberIds(advisorAssignments, currentUserId)
  const supervisedMemberIds = new Set(
    advisorAssignments
      .filter((a) => a.advisorId === currentUserId)
      .map((a) => a.memberId)
  )

  const hasOwnStake = items.some((item) => {
    const memberId = getMemberId(item)
    return memberId !== null && myScopeMemberIds.has(memberId)
  })
  const scopeToMine = scopeOverride ?? hasOwnStake
  const visibleItems = scopeToMine
    ? items.filter((item) => {
        const memberId = getMemberId(item)
        return memberId !== null && myScopeMemberIds.has(memberId)
      })
    : items

  return { scopeToMine, setScopeOverride, visibleItems, supervisedMemberIds }
}
