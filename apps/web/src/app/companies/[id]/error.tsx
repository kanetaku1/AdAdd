"use client"

import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/query-state"
import { getErrorMessage } from "@/lib/errors"

/**
 * Next.js route error boundary — catches getCompany() throwing (a genuine
 * error, distinct from the not-found case which uses notFound() and its own
 * not-found.tsx). Previously unhandled (Issue #25).
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
      <ErrorBanner
        message={getErrorMessage(error, { fallback: "読み込みに失敗しました" })}
      />
      <Button variant="outline" onClick={() => reset()} className="w-fit">
        再試行
      </Button>
    </div>
  )
}
