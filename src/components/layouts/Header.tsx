import { Menu } from 'lucide-react'
import {
  APP_SHELL_HEADER_HEIGHT,
  SIDEBAR_HEADER_WIDTH_COLLAPSED,
  SIDEBAR_HEADER_WIDTH_EXPANDED,
  SIDEBAR_TRANSITION,
} from '@/constants/layout'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import { HeaderUserMenu } from '@/components/layouts/HeaderUserMenu'
import { useSidebar } from '@/hooks/useSidebar'

function DesktopHeaderLogo() {
  const { collapsed, toggleCollapsed } = useSidebar()

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-1 overflow-hidden',
        SIDEBAR_TRANSITION,
        collapsed ? SIDEBAR_HEADER_WIDTH_COLLAPSED : SIDEBAR_HEADER_WIDTH_EXPANDED,
        collapsed ? 'px-2' : 'px-3',
      )}
    >
      <Logo
        variant={collapsed ? 'header' : 'sidebar'}
        linkTo="/dashboard"
        className={collapsed ? 'h-8 w-8' : undefined}
      />
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
        aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function Header() {
  return (
    <>
      {/* Mobile — logo + compte */}
      <header
        className={cn(
          'sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:px-4 lg:hidden',
          APP_SHELL_HEADER_HEIGHT,
        )}
      >
        <Logo variant="header" linkTo="/dashboard" />
        <HeaderUserMenu />
      </header>

      {/* Desktop — barre pleine largeur */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 hidden items-center border-b border-border/80 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 lg:flex',
          APP_SHELL_HEADER_HEIGHT,
        )}
      >
        <DesktopHeaderLogo />
        <div className="flex flex-1 items-center justify-end px-6">
          <HeaderUserMenu />
        </div>
      </header>
    </>
  )
}
