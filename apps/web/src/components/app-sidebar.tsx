"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  CalendarRange,
  ClipboardCheck,
  ListChecks,
  Wallet,
  CalendarClock,
  Settings,
  Image,
  LogOut,
} from "lucide-react"

import { useActiveYear } from "@/components/active-year-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useCurrentUser } from "@/components/current-user-provider"
import { canAccess } from "@/lib/auth/roles"

/**
 * Navigation Structure — spec/frontend.md. `allowedRoles` matches
 * spec/frontend.md#Navigation Structure's explicit gating (Finance/Settings
 * only) — every other item stays visible to any authenticated User.
 */
const NAV_ITEMS = [
  { title: "ダッシュボード", url: "/", icon: LayoutDashboard, yearScoped: true },
  { title: "企業一覧", url: "/companies", icon: Building2, yearScoped: false },
  { title: "協賛企業(年度別)", url: "/yearly-companies", icon: CalendarRange, yearScoped: true },
  { title: "協賛メニュー", url: "/sponsorship-menus", icon: ListChecks, yearScoped: true },
  { title: "広告管理", url: "/contract-menus", icon: ClipboardCheck, yearScoped: true },
  { title: "広告進捗", url: "/ad-material-progress", icon: Image, yearScoped: true },
  {
    title: "財務",
    url: "/finance",
    icon: Wallet,
    allowedRoles: ["FINANCE_DEPARTMENT", "ADMINISTRATOR"],
    yearScoped: true,
  },
  { title: "年度", url: "/years", icon: CalendarClock, yearScoped: false },
  {
    title: "設定",
    url: "/settings",
    icon: Settings,
    allowedRoles: ["ADMINISTRATOR"],
    yearScoped: false,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedYearId = searchParams.get("yearId")
  const { years, activeYear } = useActiveYear()
  const selectedYear =
    years.find((year) => year.id === requestedYearId) ?? activeYear
  const isPastYearView =
    Boolean(requestedYearId) &&
    Boolean(selectedYear) &&
    !selectedYear?.isActive &&
    NAV_ITEMS.some(
      (item) =>
        item.yearScoped &&
        (pathname === item.url || pathname.startsWith(`${item.url}/`))
    )
  const selectedYearId = selectedYear?.id ?? requestedYearId
  const { currentUser } = useCurrentUser()
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || canAccess(currentUser?.roles, item.allowedRoles)
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="text-base font-semibold">AdAdd</span>
        </div>
        {selectedYear && (
          <div className="px-2 pb-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {requestedYearId ? "表示対象年度" : "運用中年度"}:{" "}
            <span className="font-medium text-foreground">{selectedYear.name}年度</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>協賛管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={
                      <Link
                        href={`${item.url}${item.yearScoped && selectedYearId ? `?yearId=${encodeURIComponent(selectedYearId)}` : ""}`}
                      />
                    }
                    isActive={
                      pathname === item.url ||
                      pathname.startsWith(`${item.url}/`)
                    }
                    className={
                      item.yearScoped && isPastYearView
                        ? "border-l-2 border-sky-600 bg-sky-50 text-sky-950 hover:bg-sky-100 hover:text-sky-950 dark:bg-sky-950/40 dark:text-sky-100 dark:hover:bg-sky-900/60"
                        : undefined
                    }
                    tooltip={
                      item.yearScoped && isPastYearView && selectedYear
                        ? `${item.title}（${selectedYear.name}年度で表示）`
                        : item.title
                    }
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            {isPastYearView && (
              <p className="px-2 pt-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                過去年度を表示中
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {currentUser && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar size="sm">
                  <AvatarFallback>{currentUser.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{currentUser.name}</span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <form action="/api/auth/logout" method="POST">
                <SidebarMenuButton type="submit" tooltip="ログアウト">
                  <LogOut />
                  <span>ログアウト</span>
                </SidebarMenuButton>
              </form>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
