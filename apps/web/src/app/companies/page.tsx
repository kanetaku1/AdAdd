import { CompaniesTable } from "@/components/companies-table"
import { CreateCompanyButton } from "@/components/create-company-button"
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-muted-foreground">企業マスタの管理</p>
        </div>
        <CreateCompanyButton />
      </div>

      <CompaniesTable companies={companies} />
    </div>
  )
}
