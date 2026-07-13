/**
 * User (spec/model.md#User) — a system user.
 *
 * Only the fields needed for UC-12's create/list/disable flow are exercised
 * by the current UI; role assignment (Role, spec/model.md#Role) has no UI
 * yet (see spec/usecase.md UC-12 Notes).
 */
export type User = {
  id: string
  studentId: string
  name: string
  email: string
  slackId: string | null
  isActive: boolean
}
