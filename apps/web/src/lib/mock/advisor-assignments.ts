import type { AdvisorAssignment } from "@/types/advisor-assignment"

/**
 * Placeholder data matching GET /advisor-assignments?yearId={yearId}
 * (spec/api.md). A Member may have multiple Advisors within the same Year
 * (spec/model.md#AdvisorAssignment) — 鈴木 (user_002) here has two, matching
 * the existing Advisor Dashboard example in spec/frontend.md.
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
  {
    id: "advisor_assignment_003",
    yearId: "year_2026",
    advisorId: "user_003",
    memberId: "user_002",
    assignedAt: "2026-04-06T00:00:00Z",
  },
]

/**
 * Mutates the shared mock array so adding/removing an Advisor persists for
 * the rest of the browser session (spec/usecase.md UC-03). Always adds a new
 * row — a Member may have multiple Advisors at once — mirroring the backend
 * rejecting a duplicate Year+Member+Advisor combination with 409.
 */
export function addAdvisorAssignment(
  yearId: string,
  memberId: string,
  advisorId: string
): AdvisorAssignment {
  const exists = mockAdvisorAssignments.some(
    (a) =>
      a.yearId === yearId && a.memberId === memberId && a.advisorId === advisorId
  )
  if (exists) throw new Error("advisor assignment already exists")

  const assignment: AdvisorAssignment = {
    id: crypto.randomUUID(),
    yearId,
    memberId,
    advisorId,
    assignedAt: new Date().toISOString(),
  }
  mockAdvisorAssignments.push(assignment)
  return assignment
}

/** Removes a single advisor assignment without affecting the member's others. */
export function removeAdvisorAssignment(id: string): void {
  const index = mockAdvisorAssignments.findIndex((a) => a.id === id)
  if (index !== -1) {
    mockAdvisorAssignments.splice(index, 1)
  }
}
