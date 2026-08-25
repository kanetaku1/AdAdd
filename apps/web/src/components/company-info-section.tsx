"use client"

import { EditableTextField } from "@/components/editable-text-field"
import type { YearlyCompanyContact } from "@/types/yearly-company"

/**
 * Company Information card on Yearly Company Detail
 * (spec/frontend.md#Yearly Company Detail → Company Information).
 * One consolidated block of this Year's contact snapshot; click a cell to
 * edit (Principle 4). Website is edited in the identity heading, not here.
 */
export function CompanyInfoSection({
  contact,
  onChange,
  disabled,
}: {
  contact: YearlyCompanyContact
  onChange: (patch: Partial<YearlyCompanyContact>) => void
  disabled?: boolean
}) {
  const addressDisplay = [contact.postalCode, contact.address]
    .filter(Boolean)
    .join(" ")

  return (
    <section
      aria-label="企業情報"
      className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2"
    >
      <div>
        <div className="text-muted-foreground">住所</div>
        {disabled ? (
          <div>
            {contact.postalCode ? `〒${contact.postalCode} ` : ""}
            {contact.address || "-"}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <EditableTextField
              aria-label="郵便番号"
              value={contact.postalCode}
              onChange={(postalCode) => onChange({ postalCode })}
              display={
                contact.postalCode
                  ? `〒${contact.postalCode}`
                  : addressDisplay
                    ? "〒"
                    : "-"
              }
            />
            <EditableTextField
              aria-label="住所"
              value={contact.address}
              onChange={(address) => onChange({ address })}
            />
          </div>
        )}
      </div>
      <div>
        <div className="text-muted-foreground">電話番号</div>
        <EditableTextField
          aria-label="電話番号"
          value={contact.phoneNumber}
          onChange={(phoneNumber) => onChange({ phoneNumber })}
          disabled={disabled}
        />
      </div>
      <div>
        <div className="text-muted-foreground">企業担当者名</div>
        <EditableTextField
          aria-label="企業担当者名"
          value={contact.contactPersonName}
          onChange={(contactPersonName) => onChange({ contactPersonName })}
          disabled={disabled}
        />
      </div>
      <div>
        <div className="text-muted-foreground">連絡先</div>
        <EditableTextField
          aria-label="連絡先"
          value={contact.contactEmailOrForm}
          onChange={(contactEmailOrForm) => onChange({ contactEmailOrForm })}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-2">
        <div className="text-muted-foreground">引継ぎ事項</div>
        <EditableTextField
          aria-label="引継ぎ事項"
          value={contact.memo}
          onChange={(memo) => onChange({ memo })}
          disabled={disabled}
          multiline
        />
      </div>
    </section>
  )
}
