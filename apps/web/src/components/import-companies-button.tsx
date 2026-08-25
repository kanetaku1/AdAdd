"use client"

import { CsvBulkImportDialog } from "@/components/csv-bulk-import-dialog"
import { useCurrentUser } from "@/components/current-user-provider"
import { canAccess } from "@/lib/auth/roles"
import {
  bulkImportCompanies,
  COMPANY_CSV_EXAMPLE_ROW,
  COMPANY_CSV_HEADERS,
} from "@/lib/data/companies"
import type { Company } from "@/types/company"

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
    <CsvBulkImportDialog<Company>
      title="企業をCSVで一括登録"
      description="UTF-8のCSVを選ぶと、登録前に内容を確認できます。ヘッダー名はテンプレートと一致させてください。すでに同じ企業名がある行はエラーになり、それ以外だけ登録します。"
      templateFileName="companies-import-template.csv"
      templateHeaders={COMPANY_CSV_HEADERS}
      templateExampleRow={COMPANY_CSV_EXAMPLE_ROW}
      columns={[
        { header: "企業名", cell: (row) => row.companyName },
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
