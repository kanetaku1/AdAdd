"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import type { Company } from "@/types/company"

type CompanyFormValues = Omit<Company, "id" | "createdAt" | "updatedAt">

const EMPTY_VALUES: CompanyFormValues = {
  companyName: "",
  companyNameKana: "",
  postalCode: "",
  address: "",
  phoneNumber: "",
  website: "",
  contactPersonName: "",
  contactEmailOrForm: "",
  firstSponsorshipYear: "",
  memo: "",
}

/**
 * Create/edit form for Company (spec/model.md#Company).
 * Shared by /companies/new and /companies/[id] so the two screens never drift apart.
 * TODO: wire onSubmit to POST /companies / PATCH /companies/{companyId} once the
 * backend Company endpoints exist (spec/api.md). Currently a client-only stub.
 */
export function CompanyForm({
  mode,
  initialValue,
}: {
  mode: "create" | "edit"
  initialValue?: Company
}) {
  const router = useRouter()
  const [values, setValues] = useState<CompanyFormValues>(
    initialValue ?? EMPTY_VALUES
  )

  function set<K extends keyof CompanyFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    router.push("/companies")
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <FieldGroup>
        <FieldSet>
          <FieldLegend>基本情報</FieldLegend>
          <Field>
            <FieldLabel htmlFor="companyName">会社名</FieldLabel>
            <Input
              id="companyName"
              required
              value={values.companyName}
              onChange={(e) => set("companyName", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="companyNameKana">フリガナ</FieldLabel>
            <Input
              id="companyNameKana"
              value={values.companyNameKana}
              onChange={(e) => set("companyNameKana", e.target.value)}
            />
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>連絡先</FieldLegend>
          <Field>
            <FieldLabel htmlFor="contactPersonName">
              企業担当者名(様・役職なし)
            </FieldLabel>
            <Input
              id="contactPersonName"
              value={values.contactPersonName}
              onChange={(e) => set("contactPersonName", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactEmailOrForm">
              メールアドレス / 問い合わせフォームURL
            </FieldLabel>
            <Input
              id="contactEmailOrForm"
              value={values.contactEmailOrForm}
              onChange={(e) => set("contactEmailOrForm", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="phoneNumber">電話番号</FieldLabel>
            <Input
              id="phoneNumber"
              value={values.phoneNumber}
              onChange={(e) => set("phoneNumber", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="postalCode">郵便番号</FieldLabel>
            <Input
              id="postalCode"
              value={values.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="address">住所</FieldLabel>
            <Input
              id="address"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="website">Webサイト</FieldLabel>
            <Input
              id="website"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>協賛履歴</FieldLegend>
          <Field>
            <FieldLabel htmlFor="firstSponsorshipYear">
              協賛開始年度
            </FieldLabel>
            <Input
              id="firstSponsorshipYear"
              value={values.firstSponsorshipYear}
              onChange={(e) => set("firstSponsorshipYear", e.target.value)}
            />
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>メモ</FieldLegend>
          <Field>
            <FieldLabel htmlFor="memo">備考</FieldLabel>
            <Textarea
              id="memo"
              rows={4}
              value={values.memo}
              onChange={(e) => set("memo", e.target.value)}
            />
          </Field>
        </FieldSet>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            render={<Link href="/companies" />}
          >
            キャンセル
          </Button>
          <Button type="submit">
            {mode === "create" ? "登録" : "保存"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
