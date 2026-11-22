"use client"

import { Suspense, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MockModeBanner } from "@/components/mock-mode-banner"
import { SessionExpiredDialog } from "@/components/session-expired-dialog"
import { TooltipProvider } from "@/components/ui/tooltip"

const subscribeToHydration = () => () => {}
const getClientHydrationSnapshot = () => true
const getServerHydrationSnapshot = () => false

/**
 * Hides the app chrome (sidebar/nav) on /login — that screen renders its
 * own centered layout and shouldn't show navigation for a session that
 * doesn't exist yet (spec/frontend.md#Login).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  )

  if (pathname === "/login") {
    return (
      <>
        <MockModeBanner />
        {children}
      </>
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Suspense fallback={null}>
          {/*
            AppSidebar reads useSearchParams(). During hydration that hook can
            suspend on the client even when the server already emitted the
            sidebar, leaving React to compare the server sidebar with this
            boundary's null fallback. Render it only after hydration so the
            server and the client's first tree are identical.
          */}
          {isHydrated ? <AppSidebar /> : null}
        </Suspense>
        <main className="flex min-h-svh flex-1 flex-col">
          <MockModeBanner />
          <div className="flex h-12 items-center border-b px-4">
            <SidebarTrigger />
          </div>
          <div className="flex-1 p-6">{children}</div>
        </main>
        <SessionExpiredDialog />
      </SidebarProvider>
    </TooltipProvider>
  )
}
