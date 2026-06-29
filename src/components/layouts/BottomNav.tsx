import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  getMobileAccueilPath,
  getMobileActionNavForRoles,
  isMobileAccueilActive,
  isMobileActionRouteActive,
} from '@/constants/roles'
import { MobileMoreSheet } from '@/components/layouts/MobileMoreSheet'

const tabClass =
  'flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-xs font-medium transition-colors'

function SideNavLink({
  to,
  label,
  icon: Icon,
  isActive,
}: {
  to: string
  label: string
  icon: typeof Home
  isActive: boolean
}) {
  return (
    <NavLink to={to} className={tabClass} aria-current={isActive ? 'page' : undefined}>
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
          isActive ? 'bg-brand-orange/10 text-brand-orange' : 'text-muted-foreground',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      </span>
      <span className={cn('max-w-full truncate leading-tight', isActive ? 'text-brand-orange' : 'text-muted-foreground')}>
        {label}
      </span>
    </NavLink>
  )
}

export function BottomNav() {
  const { user } = useAuth()
  const location = useLocation()
  const [actionsOpen, setActionsOpen] = useState(false)

  const accueilPath = useMemo(() => getMobileAccueilPath(user?.roles ?? []), [user?.roles])
  const actions = useMemo(() => getMobileActionNavForRoles(user?.roles ?? []), [user?.roles])
  const actionPaths = useMemo(() => actions.map((item) => item.path), [actions])

  const accueilActive = isMobileAccueilActive(location.pathname, accueilPath)
  const profileActive = location.pathname === '/profile'
  const actionsActive = isMobileActionRouteActive(location.pathname, actionPaths) || actionsOpen

  if (!user) return null

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 lg:hidden"
        aria-label="Navigation mobile"
      >
        <ul className="grid grid-cols-3 items-end px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <li className="min-w-0">
            <SideNavLink to={accueilPath} label="Accueil" icon={Home} isActive={accueilActive} />
          </li>

          <li className="flex min-w-0 justify-center">
            <button
              type="button"
              onClick={() => setActionsOpen(true)}
              aria-label="Ouvrir le menu des actions"
              aria-expanded={actionsOpen}
              aria-haspopup="dialog"
              className="group -mt-7 flex flex-col items-center gap-1 focus-visible:outline-none"
            >
              <span
                className={cn(
                  'flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border bg-white',
                  'ring-4 ring-background will-change-transform group-active:scale-95',
                  !actionsOpen && 'animate-nav-logo-breathe',
                  actionsActive
                    ? 'border-brand-orange/50 shadow-[0_6px_28px_rgba(245,124,0,0.3)]'
                    : 'border-border/60',
                )}
              >
                <img
                  src="/logo.png"
                  alt="KAP FRET"
                  className="h-[3.25rem] w-[3.25rem] object-contain"
                  decoding="async"
                />
              </span>
              <span
                className={cn(
                  'text-[10px] font-medium leading-tight sm:text-xs',
                  actionsActive ? 'text-brand-orange' : 'text-muted-foreground',
                )}
              >
                Menu
              </span>
            </button>
          </li>

          <li className="min-w-0">
            <SideNavLink to="/profile" label="Mon profil" icon={User} isActive={profileActive} />
          </li>
        </ul>
      </nav>

      <MobileMoreSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        items={actions}
        title="Actions"
        emptyMessage="Aucune action disponible pour votre compte."
      />
    </>
  )
}
