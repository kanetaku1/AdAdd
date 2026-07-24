import { ApiError } from "@/lib/api/client"

/**
 * Japanese message per backend error.code (apps/api/internal/handler/error.go).
 * Never surface the backend's raw message for these — it's an English,
 * developer-facing string (e.g. "invalid phase"), not business language
 * (spec/frontend.md UI Principle 2).
 */
const ERROR_CODE_MESSAGE: Record<string, string> = {
  INVALID_REQUEST: "入力内容に誤りがあります。",
  UNAUTHORIZED: "ログインが必要です。",
  FORBIDDEN: "この操作を行う権限がありません。",
  NOT_FOUND: "データが見つかりませんでした。",
  CONFLICT: "既に登録されている、または競合するデータがあります。",
  INTERNAL_ERROR: "サーバーでエラーが発生しました。時間をおいて再度お試しください。",
}

/**
 * Resolves a caught error into a Japanese, user-facing message.
 * `overrides` lets a call site give a more specific message for a known
 * code (e.g. CONFLICT → "このメールアドレスは既に使われています").
 */
export function getErrorMessage(
  e: unknown,
  options?: { fallback?: string; overrides?: Partial<Record<string, string>> }
): string {
  if (e instanceof ApiError) {
    if (e.code) {
      const specific = options?.overrides?.[e.code]
      if (specific) return specific
      const generic = ERROR_CODE_MESSAGE[e.code]
      if (generic) return generic
    }
    return e.message || options?.fallback || "操作に失敗しました"
  }
  if (e instanceof Error) return e.message
  return options?.fallback ?? "操作に失敗しました"
}
