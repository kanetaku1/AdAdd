/**
 * Role (spec/model.md#Role) — the 7 canonical codes, matching the Role
 * table's fixed master data (spec/domain.md#Role, apps/api migrations
 * 0005_add_roles). `User.roles` holds these codes, resolved server-side
 * from real `UserRole` grants in API mode (lib/data/roles.ts, Issue #63).
 */
export const ROLES = [
  "GENERAL_MEMBER",
  "SPONSORSHIP_MEMBER",
  "ADVISOR",
  "COMPANY_MANAGEMENT_DEPARTMENT",
  "SPONSORSHIP_MENU_MANAGEMENT_TEAM",
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
