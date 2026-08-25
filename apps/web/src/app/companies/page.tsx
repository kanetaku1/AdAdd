import { CompaniesWorkspace } from "@/components/companies-workspace"
import { listCompanies } from "@/lib/data/companies"

/**
 * Company List (spec/frontend.md#Company Management).
 * Manages permanent Company master data — independent of festival years, so
 * its search isn't scoped to the active Year (unlike Yearly Companies /
 * Contract Menus). The active Year used by the per-row registration action
 * is read inside CompaniesTable via the shared ActiveYearProvider (Issue #18).
 */
export default async function CompaniesPage() {
  const companies = await listCompanies()

  return <CompaniesWorkspace initialCompanies={companies} />
}
