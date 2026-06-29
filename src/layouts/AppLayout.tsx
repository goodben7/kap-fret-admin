import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layouts/Header'
import { Sidebar } from '@/components/layouts/Sidebar'
import { BottomNav } from '@/components/layouts/BottomNav'
import { SidebarProvider } from '@/providers/SidebarProvider'
import { useSidebar } from '@/hooks/useSidebar'
import {
  APP_SHELL_HEADER_PADDING,
  SIDEBAR_MAIN_PL_COLLAPSED,
  SIDEBAR_MAIN_PL_EXPANDED,
  SIDEBAR_TRANSITION,
} from '@/constants/layout'
import { cn } from '@/lib/utils'

function AppLayoutShell() {
  const { collapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar />
      <div
        className={cn(
          SIDEBAR_TRANSITION,
          collapsed ? SIDEBAR_MAIN_PL_COLLAPSED : SIDEBAR_MAIN_PL_EXPANDED,
          APP_SHELL_HEADER_PADDING,
        )}
      >
        <main className="p-4 pb-28 lg:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutShell />
    </SidebarProvider>
  )
}
