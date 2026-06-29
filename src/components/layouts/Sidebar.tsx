import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Ticket,
  UserCheck,
  Package,
  Settings,
  User,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/hooks/useSidebar'
import { NAV_ITEMS, getNavItemsForRoles } from '@/constants/roles'
import {
  APP_SHELL_HEADER_TOP,
  SIDEBAR_TRANSITION,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from '@/constants/layout'

const iconMap = {
  LayoutDashboard,
  Ticket,
  UserCheck,
  Package,
  Settings,
  Receipt,
}

function CollapsedNavTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap',
        'rounded-lg bg-brand-navy px-2.5 py-1.5 text-xs font-medium text-white shadow-lg',
        'opacity-0 transition-opacity duration-150 group-hover/nav:opacity-100',
      )}
    >
      {label}
    </span>
  )
}

function SidebarNavLink({
  to,
  label,
  icon: Icon,
  collapsed,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  collapsed: boolean
}) {
  const link = (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-xl text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
          isActive
            ? 'bg-brand-orange text-white shadow-sm'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <div className="group/nav relative">
      {link}
      <CollapsedNavTooltip label={label} />
    </div>
  )
}

export function Sidebar() {
  const { user } = useAuth()
  const { collapsed } = useSidebar()
  const navItems = getNavItemsForRoles(user?.roles ?? [], NAV_ITEMS)

  return (
    <aside
      className={cn(
        'hidden lg:fixed lg:bottom-0 lg:left-0 lg:flex lg:flex-col lg:border-r lg:border-border/80 lg:bg-background',
        APP_SHELL_HEADER_TOP,
        SIDEBAR_TRANSITION,
        collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        collapsed && 'overflow-visible',
      )}
    >
      <nav
        className={cn(
          'flex-1 py-4',
          collapsed ? 'overflow-visible px-2' : 'overflow-x-hidden overflow-y-auto px-3',
        )}
        aria-label="Navigation principale"
      >
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard
            return (
              <li key={item.path}>
                <SidebarNavLink to={item.path} label={item.label} icon={Icon} collapsed={collapsed} />
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={cn('shrink-0 border-t border-border/80 p-3', collapsed && 'px-2')}>
        <SidebarNavLink to="/profile" label="Mon profil" icon={User} collapsed={collapsed} />
      </div>
    </aside>
  )
}
