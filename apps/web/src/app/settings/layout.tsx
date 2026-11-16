"use client"

import { Suspense } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { useSelectedYear } from "@/hooks/use-selected-year"

/**
 * Settings (spec/frontend.md#Settings) — groups the system-administration
 * screens behind one sidebar entry, each as its own sub-route/tab.
 */
const SETTINGS_TABS = [
  { title: "ユーザー", url: "/settings/users", yearScoped: false },
  { title: "アドバイザー", url: "/settings/advisors", yearScoped: true },
  {
    title: "書類発行情報",
    url: "/settings/document-issuer",
    yearScoped: true,
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">設定</h1>
        <p className="text-muted-foreground">システム管理</p>
      </div>

      <Suspense fallback={<div className="h-9 border-b" />}>
        <SettingsTabs />
      </Suspense>

      {children}
    </div>
  )
}

function SettingsTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isPastYear } = useSelectedYear()
  const yearId = searchParams.get("yearId")

  return (
    <nav aria-label="設定メニュー" className="flex gap-1 border-b">
      {SETTINGS_TABS.map((tab) => {
        const href =
          tab.url !== "/settings/users" && yearId
            ? `${tab.url}?yearId=${encodeURIComponent(yearId)}`
            : tab.url
        const isSelected = pathname === tab.url
        const isPastYearScopedTab = tab.yearScoped && isPastYear
        return (
          <Link
            key={tab.url}
            href={href}
            aria-current={isSelected ? "page" : undefined}
            className={`relative -mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              isSelected
                ? `font-semibold ${
                    isPastYearScopedTab
                      ? "border-sky-600 text-sky-950 dark:text-sky-100"
                      : "border-primary text-foreground"
                  }`
                : "border-transparent text-muted-foreground hover:text-foreground"
            } ${
              isPastYearScopedTab
                ? "bg-sky-50/80 dark:bg-sky-950/30"
                : ""
            }`}
          >
            {tab.title}
          </Link>
        )
      })}
    </nav>
  )
}
