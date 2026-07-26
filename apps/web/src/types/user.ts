/**
 * Role (spec/model.md#Role) — the 4 canonical codes, matching the Role
 * table's fixed master data (spec/domain.md#Role, apps/api migrations
 * 0005_add_roles/0006_reduce_roles). `User.roles` holds these codes,
 * resolved server-side from real `UserRole` grants in API mode
 * (lib/data/roles.ts, Issue #63). Holding none is a valid, deliberate
 * view-only baseline — not an error.
 */
export const ROLES = [
  "SPONSORSHIP_MEMBER",
  "ADVISOR",
  "FINANCE_DEPARTMENT",
  "ADMINISTRATOR",
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
