import { apiFetch } from "@/lib/api/client"
import type { Role } from "@/types/user"

/**
 * Data access for the Role catalog and User<->Role grants (spec/api.md
 * #List Roles, #Grant Role, #Revoke Role, Issue #63). API-mode only — the
 * fixed 7-Role master data has no mock-mode equivalent, since the mock
 * Users screen edits `User.roles` directly (lib/mock/users.ts).
 */
export type RoleOption = {
  id: string
  code: Role
  name: string
}

export async function listRoles(): Promise<RoleOption[]> {
  return apiFetch<RoleOption[]>("/roles")
}

export async function grantRole(userId: string, roleId: string): Promise<void> {
  await apiFetch(`/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ roleId }),
  })
}

export async function revokeRole(userId: string, roleId: string): Promise<void> {
  await apiFetch(`/users/${userId}/roles/${roleId}`, { method: "DELETE" })
}
