"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/query-state"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { updateYearDocumentIssuer } from "@/lib/data/years"
import { getErrorMessage } from "@/lib/errors"
import { getMissingDocumentIssuerFields } from "@/lib/pdf/document-issuer"
import type { Year, YearDocumentIssuer } from "@/types/year"

const issuerFields: Array<{
  key: keyof YearDocumentIssuer
  label: string
  required: boolean
}> = [
  { key: "issuerName", label: "発行者名", required: true },
  { key: "issuerPostalCode", label: "郵便番号", required: true },
  { key: "issuerAddressLine1", label: "住所（1行目）", required: true },
  { key: "issuerAddressLine2", label: "住所（2行目）", required: false },
  { key: "issuerEmail", label: "メールアドレス", required: true },
  { key: "bankName", label: "銀行名", required: true },
  { key: "bankBranchName", label: "支店名", required: true },
  { key: "bankAccountType", label: "預金種別", required: true },
  { key: "bankAccountNumber", label: "口座番号", required: true },
  { key: "bankAccountHolderName", label: "口座名義", required: true },
]

function issuerFormFromYear(year: Year): YearDocumentIssuer {
  return {
    issuerName: year.issuerName ?? "",
    issuerPostalCode: year.issuerPostalCode ?? "",
    issuerAddressLine1: year.issuerAddressLine1 ?? "",
    issuerAddressLine2: year.issuerAddressLine2 ?? "",
    issuerEmail: year.issuerEmail ?? "",
    bankName: year.bankName ?? "",
    bankBranchName: year.bankBranchName ?? "",
    bankAccountType: year.bankAccountType ?? "",
    bankAccountNumber: year.bankAccountNumber ?? "",
    bankAccountHolderName: year.bankAccountHolderName ?? "",
  }
}

export function DocumentIssuerSection({
  year,
  isPastYear,
  onSaved,
}: {
  year: Year
  isPastYear: boolean
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState<YearDocumentIssuer>(() =>
    issuerFormFromYear(year)
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const missingInvoiceFields = getMissingDocumentIssuerFields(form, "invoice")

  async function handleSave() {
    if (isPastYear) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await updateYearDocumentIssuer(year.id, form)
      setSaved(true)
      await onSaved()
    } catch (e) {
      setSaveError(
        getErrorMessage(e, { fallback: "書類発行情報の保存に失敗しました" })
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">書類発行情報</h2>
        <p className="text-sm text-muted-foreground">
          請求書・領収書に表示する発行者情報と振込先です。Administratorが管理します。
        </p>
      </div>
      {isPastYear ? (
        <dl className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
          {issuerFields.map((field) => (
            <div key={field.key}>
              <dt className="text-sm text-muted-foreground">{field.label}</dt>
              <dd className="break-words">
                {year[field.key]?.trim() || "未設定"}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <>
          <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
            {issuerFields.map((field) => (
              <Field key={field.key}>
                <FieldLabel htmlFor={`issuer-${field.key}`}>
                  {field.label}
                  {field.required ? "（必須）" : "（任意）"}
                </FieldLabel>
                <Input
                  id={`issuer-${field.key}`}
                  value={form[field.key] ?? ""}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                    setSaved(false)
                  }}
                />
              </Field>
            ))}
          </div>
          {missingInvoiceFields.length > 0 && (
            <p className="text-sm text-muted-foreground">
              請求書の生成には次の項目が必要です：
              {missingInvoiceFields.join("、")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中…" : "書類発行情報を保存"}
            </Button>
            {saved && (
              <p role="status" className="text-sm text-muted-foreground">
                保存しました。
              </p>
            )}
            <ErrorBanner message={saveError} />
          </div>
        </>
      )}
    </section>
  )
}
