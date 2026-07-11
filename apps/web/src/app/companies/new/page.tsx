import { CompanyForm } from "@/components/company-form"

export default function NewCompanyPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">企業を登録</h1>
        <p className="text-muted-foreground">企業マスタの新規登録</p>
      </div>
      <CompanyForm mode="create" />
    </div>
  )
}
