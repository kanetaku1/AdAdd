import type { AdvisorAssignment } from "@/types/advisor-assignment"

/**
 * Placeholder data matching a future GET /advisor-assignments response shape
 * (spec/api.md has no AdvisorAssignment endpoints yet). Replace with a real
 * fetch once the backend endpoints exist.
 *
 * 山田 (user_005) supervises 田中 (user_001) and 鈴木 (user_002) — matches the
 * existing Advisor Dashboard example in spec/frontend.md.
 */
export const mockAdvisorAssignments: AdvisorAssignment[] = [
  {
    id: "advisor_assignment_001",
    yearId: "year_2026",
    advisorId: "user_005",
    memberId: "user_001",
    assignedAt: "2026-04-05T00:00:00Z",
  },
  {
    id: "advisor_assignment_002",
    yearId: "year_2026",
    advisorId: "user_005",
    memberId: "user_002",
    assignedAt: "2026-04-05T00:00:00Z",
  },
]

/**
 * Mutates the shared mock array so assigning/changing an Advisor persists
 * for the rest of the browser session (spec/usecase.md UC-03).
 * A Member has at most one Advisor per Year (spec/model.md constraint), so
 * this upserts the existing record for yearId+memberId rather than adding a
 * duplicate. Passing advisorId: null removes the assignment.
 * TODO: replace with POST /advisor-assignments once the backend exists
 * (spec/api.md).
 */
export function assignAdvisor(
  yearId: string,
  memberId: string,
  advisorId: string | null
): void {
  const index = mockAdvisorAssignments.findIndex(
    (a) => a.yearId === yearId && a.memberId === memberId
  )

  if (!advisorId) {
    if (index !== -1) {
      mockAdvisorAssignments.splice(index, 1)
    }
    return
  }

  const assignedAt = new Date().toISOString()
  if (index !== -1) {
    mockAdvisorAssignments[index].advisorId = advisorId
    mockAdvisorAssignments[index].assignedAt = assignedAt
  } else {
    mockAdvisorAssignments.push({
      id: crypto.randomUUID(),
      yearId,
      advisorId,
      memberId,
      assignedAt,
    })
  }
}

/**
 * A Yearly Company's Advisor is derived, not stored directly (spec/domain.md
 * Rule 9): its assigned member's AdvisorAssignment for that Year, if any.
 */
export function advisorIdForMember(
  yearId: string,
  memberId: string | null
): string | null {
  if (!memberId) return null
  return (
    mockAdvisorAssignments.find(
      (a) => a.yearId === yearId && a.memberId === memberId
    )?.advisorId ?? null
  )
}
