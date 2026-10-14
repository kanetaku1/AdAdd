import { Button } from "@/components/ui/button"
import { MockSignInButtons } from "@/components/mock-sign-in-buttons"
import { ErrorBanner } from "@/components/query-state"
import { isApiEnabled } from "@/lib/api/client"

const ERROR_MESSAGES: Record<string, string> = {
  not_registered:
    "このメールアドレスは登録されていません。管理者に連絡してください。",
  invalid_state: "ログインの検証に失敗しました。もう一度お試しください。",
  not_configured: "ログイン機能が設定されていません。管理者に連絡してください。",
  server_error: "ログインに失敗しました。もう一度お試しください。",
}

/**
 * Login screen (spec/frontend.md#Login). In API mode, the Google button is
 * a plain link to /api/auth/google, which starts the server-side OAuth
 * flow. In mock mode there is no backend, so the User is chosen per Role
 * instead (spec/frontend.md#Mock mode login).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.server_error) : null

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-semibold">AdAdd</h1>
        <p className="text-muted-foreground">技大祭 協賛管理システム</p>
      </div>

      {message && (
        <div className="w-full max-w-sm">
          <ErrorBanner message={message} />
        </div>
      )}

      {isApiEnabled() ? (
        <Button render={<a href="/api/auth/google" />}>Googleでログイン</Button>
      ) : (
        <MockSignInButtons />
      )}
    </div>
  )
}
