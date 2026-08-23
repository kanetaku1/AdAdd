import type { Company } from "@/types/company"

/**
 * Company Information block on Yearly Company Detail
 * (spec/frontend.md#Yearly Company Detail → Company Information).
 * One consolidated block: contact person, contact, address, handover notes.
 */
export function CompanyInfoSection({
  company,
  notes,
}: {
  company: Company | null
  notes: string | null
}) {
  return (
    <section className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <div className="text-muted-foreground">企業担当者（先方）</div>
        <div>{company?.contactPersonName ?? "-"}</div>
      </div>
      <div>
        <div className="text-muted-foreground">連絡先</div>
        <div className="break-all">{company?.contactEmailOrForm ?? "-"}</div>
      </div>
      <div>
        <div className="text-muted-foreground">住所</div>
        <div>
          {company?.postalCode ? `〒${company.postalCode} ` : ""}
          {company?.address ?? "-"}
        </div>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <div className="text-muted-foreground">メモ</div>
        <div>{notes || company?.memo || "-"}</div>
      </div>
    </section>
  )
}
