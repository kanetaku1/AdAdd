/**
 * Builds an absolute URL on the web app's public origin (Issue #168).
 *
 * `APP_ORIGIN` (e.g. `https://adadd.example`) is the origin members use. The
 * Google sign-in redirect URI must match the one registered on the OAuth
 * client, and behind a reverse proxy or hosting service the incoming
 * request's URL can carry an internal host instead. When `APP_ORIGIN` is
 * empty, the request's own origin is used, which is right when the browser
 * reaches Next.js directly (local development). See
 * spec/development.md#Environment variables.
 */
export function appUrl(
  path: string,
  requestUrl: string,
  appOrigin: string | undefined = process.env.APP_ORIGIN
): URL {
  const origin = appOrigin?.trim()
  return new URL(path, origin ? origin : requestUrl)
}
