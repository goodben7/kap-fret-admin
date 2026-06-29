import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Menu, Package, Receipt, Settings, Ticket, User, UserCheck, X } from 'lucide-react'
import type { NavItem } from '@/constants/roles'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const iconMap = {
  LayoutDashboard,
  Ticket,
  UserCheck,
  Package,
  Settings,
  User,
  Menu,
  Receipt,
}

interface MobileMoreSheetProps {
  open: boolean
  onClose: () => void
  items: NavItem[]
  title?: string
  emptyMessage?: string
}

export function MobileMoreSheet({
  open,
  onClose,
  items,
  title = 'Menu',
  emptyMessage = 'Aucun élément disponible.',
}: MobileMoreSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Fermer le menu"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[70dvh] flex-col rounded-t-2xl bg-background shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex shrink-0 flex-col items-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>
        <div className="flex shrink-0 items-center justify-between border-b px-4 pb-3 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white shadow-sm">
              <img src="/logo.png" alt="" className="h-6 w-6 object-contain" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" aria-label="Navigation secondaire">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Menu
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-orange/10 text-brand-orange'
                          : 'text-foreground hover:bg-muted/60',
                      )
                    }
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        'bg-muted/50 text-muted-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
          )}
        </nav>
      </div>
    </div>
  )
}
