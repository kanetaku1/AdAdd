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
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Yearly Companies", url: "/yearly-companies", icon: CalendarRange },
  { title: "Contract Menus", url: "/contract-menus", icon: ClipboardCheck },
  { title: "Sponsorship Menus", url: "/sponsorship-menus", icon: ListChecks },
  {
    title: "Ad Material Progress",
    url: "/ad-material-progress",
    icon: Image,
  },
  {
    title: "Finance",
    url: "/finance",
    icon: Wallet,
    allowedRoles: ["FINANCE_DEPARTMENT", "ADMINISTRATOR"],
  },
  { title: "Years", url: "/years", icon: CalendarClock },
  {
    title: "Settings",
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
          <SidebarGroupLabel>Sponsorship Management</SidebarGroupLabel>
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
