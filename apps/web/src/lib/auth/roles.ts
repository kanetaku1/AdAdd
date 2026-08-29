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
 * When true, skip role gating entirely (mirrors proxy.ts's login-guard
 * bypass). `/users/me`'s `roles` always reflects the real DB `UserRole`
 * grants, never the X-User-Roles dev-stub header — without this bypass, an
 * unassigned dev-stub user would have every gated action hidden.
 */
export function isDevAuthBypass(): boolean {
  if (process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true") return true
  return !process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
}

/** `hasRole`, but respects the dev-auth bypass. The gate to actually use. */
export function canAccess(roles: string[] | undefined, allowed: string[]): boolean {
  return isDevAuthBypass() || hasRole(roles, allowed)
}
