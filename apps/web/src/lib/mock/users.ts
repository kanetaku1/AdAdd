import type { User } from "@/types/user"

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
    isActive: true,
  },
  {
    id: "user_002",
    studentId: "b2345678",
    name: "鈴木",
    email: "suzuki@example.com",
    slackId: null,
    isActive: true,
  },
  {
    id: "user_003",
    studentId: "b3456789",
    name: "佐藤",
    email: "sato@example.com",
    slackId: "U03SATO",
    isActive: true,
  },
  {
    id: "user_004",
    studentId: "b4567890",
    name: "高橋",
    email: "takahashi@example.com",
    slackId: null,
    isActive: false,
  },
  {
    id: "user_005",
    studentId: "b5678901",
    name: "山田",
    email: "yamada@example.com",
    slackId: "U05YAMADA",
    isActive: true,
  },
]

/**
 * Mutates the shared mock array so newly added/edited Users persist for the
 * rest of the browser session (spec/usecase.md UC-12).
 * TODO: replace with POST /users once the backend exists (spec/api.md).
 */
export function addUser(user: User): void {
  mockUsers.push(user)
}

export function updateUser(id: string, patch: Partial<User>): void {
  const user = mockUsers.find((u) => u.id === id)
  if (user) {
    Object.assign(user, patch)
  }
}
