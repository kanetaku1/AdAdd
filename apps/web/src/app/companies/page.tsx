import { Suspense } from "react"

import { CompaniesWorkspace } from "@/components/companies-workspace"

/**
 * Company List (spec/frontend.md#Company Management).
 * Manages permanent Company master data — independent of festival years, so
 * its search isn't scoped to the active Year (unlike Yearly Companies /
 * Contract Menus). The active Year used by the per-row registration action
 * is read inside CompaniesTable via the shared ActiveYearProvider (Issue #18).
 * Data is loaded in the browser by CompaniesWorkspace (Issue #152).
 */
export default function CompaniesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">読み込み中...</div>}>
      <CompaniesWorkspace />
    </Suspense>
  )
}
