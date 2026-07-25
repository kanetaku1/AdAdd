"use client"

import { usePathname } from "next/navigation"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

/**
 * Hides the app chrome (sidebar/nav) on /login — that screen renders its
 * own centered layout and shouldn't show navigation for a session that
 * doesn't exist yet (spec/frontend.md#Login).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/login") {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex min-h-svh flex-1 flex-col">
          <div className="flex h-12 items-center border-b px-4">
            <SidebarTrigger />
          </div>
          <div className="flex-1 p-6">{children}</div>
        </main>
      </SidebarProvider>
    </TooltipProvider>
  )
}
