import { apiFetch, ApiError, isApiEnabled } from "@/lib/api/client"
import { csvCell, parseCsv } from "@/lib/csv"
import {
  addUser as addMockUser,
  mockUsers,
  updateUser as updateMockUser,
} from "@/lib/mock/users"
import type { BulkError, BulkResult } from "@/types/bulk"
import { ROLES, type Role, type User } from "@/types/user"

export const USER_CSV_HEADERS = [
  "studentId",
  "name",
  "email",
  "slackId",
  "roles",
] as const

export const USER_CSV_EXAMPLE_ROW = [
  "b9999999",
  "新規太郎",
  "taro@example.com",
  "U99TARO",
  "SPONSORSHIP_MEMBER",
]

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

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

function mockBulkImportUsers(
  rows: string[][],
  dryRun: boolean
): BulkResult<User> {
  const headerMap = new Map(rows[0].map((header, index) => [header.trim(), index]))
  const errors: BulkError[] = []
  const valid: Array<{ user: User; roles: Role[] }> = []
  const csvEmails = new Set<string>()
  const existingEmails = new Set(mockUsers.map((user) => user.email))

  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1
    const record = rows[i]
    const name = csvCell(record, headerMap, "name")
    const email = csvCell(record, headerMap, "email")
    const studentId = csvCell(record, headerMap, "studentId")
    const slackId = csvCell(record, headerMap, "slackId")
    const rolesRaw = csvCell(record, headerMap, "roles")
    const roles = rolesRaw
      ? rolesRaw.split(",").map((role) => role.trim()).filter(Boolean)
      : []

    if (!name) {
      errors.push({ rowNumber, message: "氏名は必須です" })
      continue
    }
    if (!email) {
      errors.push({ rowNumber, message: "メールアドレスは必須です" })
      continue
    }
    if (csvEmails.has(email)) {
      errors.push({
        rowNumber,
        message: "CSV内に同じメールアドレスが存在します",
      })
      continue
    }
    if (existingEmails.has(email)) {
      errors.push({ rowNumber, message: "すでに登録されているメールアドレスです" })
      continue
    }

    let roleError = false
    const parsedRoles: Role[] = []
    for (const code of roles) {
      if (!isRole(code)) {
        errors.push({
          rowNumber,
          message: `無効なロールが指定されています: ${code}`,
        })
        roleError = true
        break
      }
      parsedRoles.push(code)
    }
    if (roleError) continue

    csvEmails.add(email)
    valid.push({
      user: {
        id: "",
        studentId,
        name,
        email,
        slackId: slackId || null,
        roles: parsedRoles,
        isActive: true,
      },
      roles: parsedRoles,
    })
  }

  if (!dryRun) {
    for (const row of valid) {
      const created = addMockUser({
        studentId: row.user.studentId,
        name: row.user.name,
        email: row.user.email,
        slackId: row.user.slackId,
        roles: row.roles,
      })
      row.user = created
    }
  }

  return {
    totalCount: rows.length - 1,
    successCount: valid.length,
    errorCount: errors.length,
    successfulRows: valid.map((row) => row.user),
    errors,
  }
}

/**
 * POST /users/bulk (spec/api.md#Bulk Import Users). `dryRun: true` previews
 * without writing — the import dialog's Preview step.
 */
export async function bulkImportUsers(
  file: File,
  dryRun: boolean
): Promise<BulkResult<User>> {
  if (isApiEnabled()) {
    const body = new FormData()
    body.append("file", file)
    body.append("dryRun", dryRun ? "true" : "false")
    return apiFetch<BulkResult<User>>("/users/bulk", { method: "POST", body })
  }
  const rows = parseCsv(await file.text())
  if (rows.length < 2) {
    throw new Error("CSVにヘッダーとデータ行が必要です")
  }
  return mockBulkImportUsers(rows, dryRun)
}
