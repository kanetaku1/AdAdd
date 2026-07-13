import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CompaniesTable } from "@/components/companies-table"
import { mockCompanies } from "@/lib/mock/companies"
import { getActiveYearId, mockYears } from "@/lib/mock/years"

/**
 * Company List (spec/frontend.md#Company Management).
 * Manages permanent Company master data — independent of festival years, so
 * its search isn't scoped to the active Year (unlike Yearly Companies /
 * Contract Menus).
 * TODO: replace mockCompanies with GET /companies once the backend endpoint exists (spec/api.md).
 */
export default function CompaniesPage() {
  const activeYearId = getActiveYearId()
  const activeYear = mockYears.find((y) => y.id === activeYearId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-muted-foreground">企業マスタの管理</p>
        </div>
        <Button render={<Link href="/companies/new" />}>企業を登録</Button>
      </div>

      <CompaniesTable companies={mockCompanies} activeYear={activeYear} />
    </div>
  )
}
