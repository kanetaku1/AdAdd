/**
 * Role (spec/model.md#Role) — the fixed example set from spec/database.md#Role.
 * `Role` has its own `id`/`name`/`description` in the domain model, but there
 * is no Role CRUD UI yet, so the frontend treats it as this fixed literal set.
 */
export const ROLES = [
  "GeneralMember",
  "CompanyManagement",
  "MenuManagement",
  "Finance",
  "Administrator",
] as const

export type Role = (typeof ROLES)[number]

/**
 * User (spec/model.md#User) — a system user.
 *
 * Covers UC-12's create/list/role-assignment/disable flow (see
 * spec/frontend.md → Settings → User List).
 */
export type User = {
  id: string
  studentId: string
  name: string
  email: string
  slackId: string | null
  roles: Role[]
  isActive: boolean
}
