"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

/**
 * Settings (spec/frontend.md#Settings) — groups the system-administration
 * screens behind one sidebar entry, each as its own sub-route/tab.
 */
const SETTINGS_TABS = [
  { title: "Users", url: "/settings/users" },
  { title: "Advisor Assignments", url: "/settings/advisor-assignments" },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">システム管理</p>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {SETTINGS_TABS.map((tab) => (
          <Button
            key={tab.url}
            variant={pathname === tab.url ? "secondary" : "ghost"}
            size="sm"
            render={<Link href={tab.url} />}
          >
            {tab.title}
          </Button>
        ))}
      </div>

      {children}
    </div>
  )
}
