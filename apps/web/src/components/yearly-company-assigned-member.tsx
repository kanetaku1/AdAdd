"use client"

import { useState } from "react"

import { AssignedMemberCell } from "@/components/assigned-member-cell"
import { mockUsers } from "@/lib/mock/users"
import { updateAssignedMember } from "@/lib/mock/yearly-companies"

/**
 * Client-state wrapper so the (server) Yearly Company Detail page can render
 * an editable assigned-member cell without itself becoming a client
 * component — same pattern as contract-progress-badge.tsx.
 */
export function YearlyCompanyAssignedMember({
  yearlyCompanyId,
  initialAssignedMemberId,
  initialAssignedMemberName,
}: {
  yearlyCompanyId: string
  initialAssignedMemberId: string | null
  initialAssignedMemberName: string | null
}) {
  const [assignedMemberId, setAssignedMemberId] = useState(
    initialAssignedMemberId
  )
  const [assignedMemberName, setAssignedMemberName] = useState(
    initialAssignedMemberName
  )

  function handleChange(userId: string | null) {
    updateAssignedMember(yearlyCompanyId, userId)
    setAssignedMemberId(userId)
    setAssignedMemberName(
      userId ? mockUsers.find((u) => u.id === userId)?.name ?? null : null
    )
  }

  return (
    <AssignedMemberCell
      assignedMemberId={assignedMemberId}
      assignedMemberName={assignedMemberName}
      onChange={handleChange}
    />
  )
}
