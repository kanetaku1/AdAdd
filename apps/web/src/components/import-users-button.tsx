"use client"

import { CsvBulkImportDialog } from "@/components/csv-bulk-import-dialog"
import {
  bulkImportUsers,
  USER_CSV_EXAMPLE_ROW,
  USER_CSV_HEADERS,
} from "@/lib/data/users"
import { roleLabel } from "@/types/user"
import type { User } from "@/types/user"

/**
 * User List CSV import (spec/frontend.md#CSV Import / Export, UC-12).
 * Shown only on the Administrator-only Users screen.
 */
export function ImportUsersButton({ onImported }: { onImported: () => void }) {
  return (
    <CsvBulkImportDialog<User>
      title="ユーザーをCSVで一括登録"
      description="UTF-8のCSVを選ぶと、登録前に内容を確認できます。ロールは SPONSORSHIP_MEMBER / ADVISOR / FINANCE_DEPARTMENT / ADMINISTRATOR のコードをカンマ区切りで指定します。空欄はロールなし（閲覧のみ）です。"
      templateFileName="users-import-template.csv"
      templateHeaders={USER_CSV_HEADERS}
      templateExampleRow={USER_CSV_EXAMPLE_ROW}
      columns={[
        { header: "学籍番号", cell: (row) => row.studentId || "-" },
        { header: "氏名", cell: (row) => row.name },
        { header: "メールアドレス", cell: (row) => row.email },
        {
          header: "ロール",
          cell: (row) =>
            row.roles?.length
              ? row.roles.map(roleLabel).join("、")
              : "-",
        },
      ]}
      preview={(file) => bulkImportUsers(file, true)}
      confirm={(file) => bulkImportUsers(file, false)}
      onImported={onImported}
    />
  )
}
