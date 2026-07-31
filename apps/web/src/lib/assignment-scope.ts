import type { AdvisorAssignment } from "@/types/advisor-assignment"

/**
 * The signed-in User's own id plus every Member they supervise as a
 * Sponsorship Advisor (`AdvisorAssignment`; spec/domain.md Rule 9 — an
 * Advisor is never assigned to a Company directly, only indirectly through
 * the Members they supervise).
 */
export function getMyScopeMemberIds(
  advisorAssignments: AdvisorAssignment[],
  currentUserId: string | null
): Set<string> {
  const supervisedMemberIds = advisorAssignments
    .filter((a) => a.advisorId === currentUserId)
    .map((a) => a.memberId)
  return new Set(
    [currentUserId, ...supervisedMemberIds].filter(
      (id): id is string => id !== null
    )
  )
}
