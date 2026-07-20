import { apiFetch, isApiEnabled } from "@/lib/api/client"
import {
  addUser as addMockUser,
  mockUsers,
  updateUser as updateMockUser,
} from "@/lib/mock/users"
import type { Role, User } from "@/types/user"

/**
 * Data access for the User domain (spec/frontend.md#Settings > User List).
 *
 * Modes (same convention as lib/data/sponsorship.ts, Issue #17):
 * - API mode (`NEXT_PUBLIC_API_BASE_URL` set): MySQL/API only. Errors propagate.
 * - Mock mode (env unset): in-memory mock data for local UI development.
 *
 * The backend User model has no Role field yet (Role management is a future
 * backend feature — spec/model.md#Role has no CRUD API). In API mode, created
 * and updated Users always come back with `roles: []`; callers should hide
 * or disable role editing when `isApiEnabled()` is true rather than silently
 * discarding a role selection the user made.
 */

export type UserFields = {
  studentId: string
  name: string
  email: string
  slackId: string | null
}

type ApiUser = Omit<User, "roles">

export async function listUsers(): Promise<User[]> {
  if (isApiEnabled()) {
    const list = await apiFetch<ApiUser[]>("/users")
    return list.map((u) => ({ ...u, roles: [] }))
  }
  return mockUsers
}

export async function createUser(
  input: UserFields & { roles: Role[] }
): Promise<User> {
  if (isApiEnabled()) {
    const created = await apiFetch<ApiUser>("/users", {
      method: "POST",
      body: JSON.stringify({
        studentId: input.studentId,
        name: input.name,
        email: input.email,
        slackId: input.slackId,
      }),
    })
    return { ...created, roles: [] }
  }
  return addMockUser(input)
}

export async function updateUser(
  id: string,
  input: Partial<UserFields & { isActive: boolean; roles: Role[] }>
): Promise<User> {
  if (isApiEnabled()) {
    const updated = await apiFetch<ApiUser>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        studentId: input.studentId,
        name: input.name,
        email: input.email,
        slackId: input.slackId,
        isActive: input.isActive,
      }),
    })
    return { ...updated, roles: [] }
  }
  return updateMockUser(id, input)
}
