import { apiFetch, isApiEnabled } from "@/lib/api/client"
import {
  addAdvisorAssignment as addMockAdvisorAssignment,
  mockAdvisorAssignments,
  removeAdvisorAssignment as removeMockAdvisorAssignment,
} from "@/lib/mock/advisor-assignments"
import type { AdvisorAssignment } from "@/types/advisor-assignment"

/**
 * Data access for the AdvisorAssignment domain (spec/frontend.md#Advisor
 * Assignment). A Member may have multiple Advisors within the same Year, so
 * these always add/remove a single row rather than upserting one per member.
 *
 * Modes (same convention as lib/data/sponsorship.ts, Issue #17):
 * - API mode (`NEXT_PUBLIC_API_BASE_URL` set): MySQL/API only. Errors propagate.
 * - Mock mode (env unset): in-memory mock data for local UI development.
 */

export async function listAdvisorAssignmentsByYear(
  yearId: string
): Promise<AdvisorAssignment[]> {
  if (isApiEnabled()) {
    return apiFetch<AdvisorAssignment[]>(
      `/advisor-assignments?yearId=${yearId}`
    )
  }
  return mockAdvisorAssignments.filter((a) => a.yearId === yearId)
}

/** Assigning the same Advisor to the same Member in the same Year returns 409. */
export async function addAdvisorAssignment(
  yearId: string,
  memberId: string,
  advisorId: string
): Promise<AdvisorAssignment> {
  if (isApiEnabled()) {
    return apiFetch<AdvisorAssignment>("/advisor-assignments", {
      method: "POST",
      body: JSON.stringify({
        yearId,
        advisorUserId: advisorId,
        memberUserId: memberId,
      }),
    })
  }
  return addMockAdvisorAssignment(yearId, memberId, advisorId)
}

/** Removes a single advisor assignment without affecting the member's others. */
export async function removeAdvisorAssignment(id: string): Promise<void> {
  if (isApiEnabled()) {
    await apiFetch(`/advisor-assignments/${id}`, { method: "DELETE" })
    return
  }
  removeMockAdvisorAssignment(id)
}
