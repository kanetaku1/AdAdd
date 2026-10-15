import { MOCK_USER_COOKIE } from "@/lib/auth/constants"
import { mockUsers } from "@/lib/mock/users"
import type { User } from "@/types/user"

/**
 * Mock mode sign-in (spec/frontend.md#Mock mode login). There is no backend
 * to mint a session, so the chosen mock User's ID is kept in a plain cookie:
 * the login guard (proxy.ts) can read it, and so can the browser code here.
 * Everything is fictitious and runs in the browser, so there is nothing to
 * protect with a password or an httpOnly cookie.
 */

const MOCK_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** Mock Users offered on /login: active, with at least one Role. */
export function listMockSignInUsers(): User[] {
  return mockUsers.filter((user) => user.isActive && user.roles.length > 0)
}

/** The signed-in mock User, or null (browser only). */
export function getMockSignedInUser(): User | null {
  if (typeof document === "undefined") return null
  const id = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${MOCK_USER_COOKIE}=`))
    ?.slice(MOCK_USER_COOKIE.length + 1)
  if (!id) return null
  return mockUsers.find((user) => user.id === decodeURIComponent(id) && user.isActive) ?? null
}

export function signInAsMockUser(userId: string): void {
  document.cookie = `${MOCK_USER_COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=${MOCK_SESSION_MAX_AGE_SECONDS}; samesite=lax`
}
