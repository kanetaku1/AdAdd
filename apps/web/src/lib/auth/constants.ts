/**
 * Cookie names shared between middleware (edge runtime — cannot import
 * next/headers) and the server-only session helpers/route handlers.
 */
export const SESSION_COOKIE = "adadd_session"
export const OAUTH_STATE_COOKIE = "adadd_oauth_state"
/** Email of the last successful Google sign-in, sent as `login_hint` (spec/frontend.md#Login). */
export const LOGIN_HINT_COOKIE = "adadd_login_hint"
/** Mock mode only: the ID of the mock User chosen on /login (lib/auth/mock-session.ts). */
export const MOCK_USER_COOKIE = "adadd_mock_user"
