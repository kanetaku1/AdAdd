"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  { title: "ダッシュボード", url: "/", icon: LayoutDashboard },
  { title: "企業一覧", url: "/companies", icon: Building2 },
  { title: "協賛企業(年度別)", url: "/yearly-companies", icon: CalendarRange },
  { title: "協賛メニュー", url: "/sponsorship-menus", icon: ListChecks },
  { title: "広告管理", url: "/contract-menus", icon: ClipboardCheck },
  { title: "広告進捗", url: "/ad-material-progress", icon: Image },
  {
    title: "財務",
    url: "/finance",
    icon: Wallet,
    allowedRoles: ["FINANCE_DEPARTMENT", "ADMINISTRATOR"],
  },
  { title: "年度", url: "/years", icon: CalendarClock },
  {
    title: "設定",
    url: "/settings",
    icon: Settings,
    allowedRoles: ["ADMINISTRATOR"],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>協賛管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={
                      pathname === item.url ||
                      pathname.startsWith(`${item.url}/`)
                    }
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
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
