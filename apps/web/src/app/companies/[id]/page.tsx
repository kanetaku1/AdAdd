import { notFound } from "next/navigation"

import { CompanyForm } from "@/components/company-form"
import { getCompany } from "@/lib/data/companies"

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const company = await getCompany(id)

  if (!company) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{company.companyName}</h1>
        <p className="text-muted-foreground">企業情報の編集</p>
      </div>
      <CompanyForm mode="edit" initialValue={company} />
    </div>
  )
}
