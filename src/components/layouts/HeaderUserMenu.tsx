import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Building2, ChevronDown, LogOut, Mail, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getDisplayName } from '@/lib/normalize-user'
import { cn } from '@/lib/utils'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function OfficeBadge({ name }: { name: string }) {
  return (
    <div
      className="flex max-w-[11rem] items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 lg:max-w-[14rem]"
      title={`Bureau d'émission : ${name}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
        <Building2 className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
          Bureau
        </p>
        <p className="truncate text-sm font-semibold leading-snug">{name}</p>
      </div>
    </div>
  )
}

const menuItemClass =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-muted/70'

export function HeaderUserMenu() {
  const { user, issuingOfficeName, logout } = useAuth()

  if (!user) return null

  const userName = getDisplayName(user)
  const initials = getInitials(userName)

  return (
    <div className="flex items-center gap-2 lg:gap-3">
      {issuingOfficeName && (
        <div className="hidden md:block">
          <OfficeBadge name={issuingOfficeName} />
        </div>
      )}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 rounded-xl border border-border/60 bg-background text-left transition-colors',
              'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40',
              'px-1.5 py-1 sm:px-2 sm:py-1.5',
            )}
            aria-label="Menu compte"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-xs font-bold text-brand-orange ring-2 ring-brand-orange/10">
              {initials}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[7rem] truncate text-sm font-semibold leading-tight lg:max-w-[11rem]">
                {userName}
              </span>
              {user.profile?.label && (
                <span className="block truncate text-[11px] font-medium text-muted-foreground">
                  {user.profile.label}
                </span>
              )}
            </span>
            <ChevronDown
              className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block"
              aria-hidden="true"
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className={cn(
              'z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border/80 bg-popover p-2 shadow-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            )}
          >
            <div className="mb-1 space-y-2 rounded-xl bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-sm font-bold text-brand-orange">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{userName}</p>
                  {user.profile?.label && (
                    <p className="truncate text-xs font-medium text-brand-orange">{user.profile.label}</p>
                  )}
                </div>
              </div>
              {user.email && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{user.email}</span>
                </p>
              )}
              {issuingOfficeName && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:hidden">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{issuingOfficeName}</span>
                </p>
              )}
            </div>

            <DropdownMenu.Item asChild>
              <Link to="/profile" className={menuItemClass}>
                <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Mon profil
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-border" />

            <DropdownMenu.Item
              className={cn(menuItemClass, 'text-destructive data-[highlighted]:bg-destructive/10')}
              onSelect={() => logout()}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Se déconnecter
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
