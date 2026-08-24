"use client"

import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/query-state"
import { getErrorMessage } from "@/lib/errors"

/**
 * Next.js route error boundary — catches listCompanies() throwing in the
 * (server) companies/page.tsx, which previously had no error handling at
 * all (Issue #25).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">企業一覧</h1>
        <p className="text-muted-foreground">企業マスタの管理</p>
      </div>
      <ErrorBanner
        message={getErrorMessage(error, { fallback: "読み込みに失敗しました" })}
      />
      <Button variant="outline" onClick={() => reset()} className="w-fit">
        再試行
      </Button>
    </div>
  )
}
