/**
 * Frontend role gating (spec/api.md#Authorization Matrix, Issue #23). Every
 * call site passes the exact same allowed-role list as the corresponding
 * backend `RequireRoles(...)` call — this is UX only, the backend remains
 * the real enforcement point, so the two must never drift apart.
 */
export function hasRole(roles: string[] | undefined, allowed: string[]): boolean {
  if (!roles) return false
  return allowed.some((r) => roles.includes(r))
}

/**
 * The gate to use in screens. The signed-in User's Roles (`/users/me`, or
 * the chosen mock User in mock mode) always apply; there is no bypass
 * (spec/decisions/0004-development-modes-and-sessions.md).
 */
export function canAccess(roles: string[] | undefined, allowed: string[]): boolean {
  return hasRole(roles, allowed)
}
