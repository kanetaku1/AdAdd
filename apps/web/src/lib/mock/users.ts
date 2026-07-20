import type { Role, User } from "@/types/user"

/**
 * Placeholder data matching a future GET /users response shape (spec/api.md
 * has no User CRUD endpoints yet). Replace with a real fetch once the
 * backend User endpoints exist.
 */
export const mockUsers: User[] = [
  {
    id: "user_001",
    studentId: "b1234567",
    name: "田中",
    email: "tanaka@example.com",
    slackId: "U01TANAKA",
    roles: ["Administrator"],
    isActive: true,
  },
  {
    id: "user_002",
    studentId: "b2345678",
    name: "鈴木",
    email: "suzuki@example.com",
    slackId: null,
    roles: ["CompanyManagement"],
    isActive: true,
  },
  {
    id: "user_003",
    studentId: "b3456789",
    name: "佐藤",
    email: "sato@example.com",
    slackId: "U03SATO",
    roles: ["Finance"],
    isActive: true,
  },
  {
    id: "user_004",
    studentId: "b4567890",
    name: "高橋",
    email: "takahashi@example.com",
    slackId: null,
    roles: ["GeneralMember"],
    isActive: false,
  },
  {
    id: "user_005",
    studentId: "b5678901",
    name: "山田",
    email: "yamada@example.com",
    slackId: "U05YAMADA",
    roles: ["MenuManagement", "GeneralMember"],
    isActive: true,
  },
]

/**
 * Mutates the shared mock array so newly added/edited Users persist for the
 * rest of the browser session (spec/usecase.md UC-12).
 */
export function addUser(input: {
  studentId: string
  name: string
  email: string
  slackId: string | null
  roles: Role[]
}): User {
  const user: User = { id: crypto.randomUUID(), isActive: true, ...input }
  mockUsers.push(user)
  return user
}

export function updateUser(id: string, patch: Partial<User>): User {
  const user = mockUsers.find((u) => u.id === id)
  if (!user) throw new Error("user not found")
  Object.assign(user, patch)
  return user
}
