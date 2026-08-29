"use client"

import { isApiEnabled } from "@/lib/api/client"

/**
 * Always-visible notice when the UI is running on in-memory mocks
 * (NEXT_PUBLIC_API_BASE_URL unset). Committee preview and local UI work
 * share this path — it must not look like production.
 */
export function MockModeBanner() {
  if (isApiEnabled()) return null

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      <p className="font-medium">試用プレビュー（モック）</p>
      <p className="mt-0.5 text-xs leading-relaxed">
        本番の協賛データではありません。入力は保存されず、ページを再読み込みすると戻ります。API
        と MySQL には接続していません。
      </p>
    </div>
  )
}
