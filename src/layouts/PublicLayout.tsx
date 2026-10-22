import { Link, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BRAND } from '@/constants/brand'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-orange/15 text-brand-orange'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

export function PublicLayout() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-muted/40 via-background to-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link to="/reserver" className="flex items-center gap-2">
            <Logo variant="compact" />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">{BRAND.name}</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/reserver" className={navLinkClass} end>
              Réserver
            </NavLink>
            <NavLink to="/suivi" className={navLinkClass}>
              Ma réservation
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        {BRAND.name} — réservation en ligne · paiement au guichet
      </footer>
    </div>
  )
}
