"use client"

import type { Year } from "@/types/year"

export function PastYearNotice({ year }: { year: Year | null }) {
  if (!year || year.isActive) return null

  return (
    <p
      role="status"
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      過去の年度（{year.name}）を表示しています。入金確認のほかは変更できません。
    </p>
  )
}
