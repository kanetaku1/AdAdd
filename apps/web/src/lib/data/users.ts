import { apiFetch, ApiError, isApiEnabled } from "@/lib/api/client"
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
 * `GET /users` returns real `roles` (resolved server-side from `UserRole`
 * grants, spec/api.md#List Users) — `listUsers` passes it through as-is.
 * `POST`/`PATCH /users` do NOT return a `roles` field (Role grant/revoke is
 * a separate call, lib/data/roles.ts, Issue #63) — a freshly created User
 * genuinely has none yet, so `roles: []` there is correct; callers editing
 * an existing User should preserve its already-known roles rather than
 * overwrite them with this empty value.
 */

export type UserFields = {
  studentId: string
  name: string
  email: string
  slackId: string | null
}

type ApiUserNoRoles = Omit<User, "roles">

/**
 * The signed-in User's identity + Role codes (spec/api.md#Login, #Get
 * Current User) — deliberately separate from `User`/`Role` above, which
 * still track the pre-#59 mock-only role vocabulary (Issue #63 reconciles
 * that). `roles` here are the real 7 canonical codes (e.g.
 * "ADMINISTRATOR") the backend now returns.
 */
export type CurrentUser = {
  id: string
  name: string
  roles: string[]
}

/**
 * `GET /users/me` (spec/api.md#Get Current User) — used by
 * CurrentUserProvider to resolve who's logged in and which Roles gate
 * navigation (Issue #23). Returns `null` when there's no session (mock
 * mode, or the request reached the backend unauthenticated) rather than
 * throwing, since "nobody is logged in" is an expected state, not a
 * failure.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isApiEnabled()) return null
  try {
    return await apiFetch<CurrentUser>("/users/me")
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
      return null
    }
    throw e
  }
}

export async function listUsers(): Promise<User[]> {
  if (isApiEnabled()) {
    return apiFetch<User[]>("/users")
  }
  return mockUsers
}

export async function createUser(
  input: UserFields & { roles: Role[] }
): Promise<User> {
  if (isApiEnabled()) {
    const created = await apiFetch<ApiUserNoRoles>("/users", {
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
    const updated = await apiFetch<ApiUserNoRoles>(`/users/${id}`, {
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
