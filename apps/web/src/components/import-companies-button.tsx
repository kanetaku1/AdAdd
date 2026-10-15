"use client"

import { CsvBulkImportDialog } from "@/components/csv-bulk-import-dialog"
import { useCurrentUser } from "@/components/current-user-provider"
import { canAccess } from "@/lib/auth/roles"
import {
  bulkImportCompanies,
  COMPANY_CSV_EXAMPLE_ROW,
  COMPANY_CSV_HEADERS,
  type CompanyImportRow,
} from "@/lib/data/companies"
import { COMPANY_STATUS_LABEL } from "@/lib/yearly-company-labels"

const ALLOWED_ROLES = ["SPONSORSHIP_MEMBER", "ADMINISTRATOR"]

/**
 * Company List CSV import (spec/frontend.md#CSV Import / Export). Split out
 * of the Server Component page so it can gate on the signed-in User —
 * same pattern as CreateCompanyButton.
 */
export function ImportCompaniesButton({
  onImported,
}: {
  onImported: () => void
}) {
  const { currentUser } = useCurrentUser()
  if (!canAccess(currentUser?.roles, ALLOWED_ROLES)) return null

  return (
    <CsvBulkImportDialog<CompanyImportRow>
      title="企業をCSVで一括登録"
      description="UTF-8のCSVを選ぶと、登録前に内容を確認できます。ヘッダー名はテンプレートと一致させてください。すでに同じ企業名がある行はエラーになり、それ以外だけ登録します。企業名は全角・半角や大文字・小文字の違いも別の企業として扱います。運用中の年度があれば、その年度にも登録します（前年度契約が「あり」なら継続、それ以外は新規）。"
      templateFileName="companies-import-template.csv"
      templateHeaders={COMPANY_CSV_HEADERS}
      templateExampleRow={COMPANY_CSV_EXAMPLE_ROW}
      columns={[
        { header: "企業名", cell: (row) => row.companyName },
        {
          header: "企業ステータス",
          cell: (row) =>
            row.companyStatus ? COMPANY_STATUS_LABEL[row.companyStatus] : "-",
        },
        { header: "企業担当者", cell: (row) => row.contactPersonName || "-" },
        {
          header: "連絡先",
          cell: (row) => row.contactEmailOrForm || "-",
        },
      ]}
      preview={(file) => bulkImportCompanies(file, true)}
      confirm={(file) => bulkImportCompanies(file, false)}
      onImported={onImported}
    />
  )
}
