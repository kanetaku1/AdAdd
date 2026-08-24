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

/** Japanese display names (spec/model.md#Role `name`). Codes stay English. */
export const ROLE_LABEL: Record<Role, string> = {
  SPONSORSHIP_MEMBER: "協賛実働メンバー",
  ADVISOR: "協賛アドバイザー",
  FINANCE_DEPARTMENT: "財務部門",
  ADMINISTRATOR: "管理者",
}

export function roleLabel(code: string): string {
  return ROLE_LABEL[code as Role] ?? code
}

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
