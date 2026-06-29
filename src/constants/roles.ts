export const ROLES = {
  SPADM: 'ROLE_SPADM',
  ADM: 'ROLE_ADM',
  TKT: 'ROLE_TKT',
  CHK: 'ROLE_CHK',
  FRT: 'ROLE_FRT',
  MGR: 'ROLE_MGR',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SPADM]: 'Super Admin',
  [ROLES.ADM]: 'Administrateur',
  [ROLES.TKT]: 'Agent Billetterie',
  [ROLES.CHK]: 'Agent Check-In',
  [ROLES.FRT]: 'Agent Fret',
  [ROLES.MGR]: 'Responsable',
}

export interface NavItem {
  label: string
  path: string
  icon: string
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: [ROLES.SPADM, ROLES.ADM, ROLES.MGR] },
  { label: 'Billetterie', path: '/tickets', icon: 'Ticket', roles: [ROLES.SPADM, ROLES.ADM, ROLES.TKT] },
  { label: 'Check-In', path: '/checkins', icon: 'UserCheck', roles: [ROLES.SPADM, ROLES.ADM, ROLES.CHK] },
  { label: 'Fret', path: '/freight', icon: 'Package', roles: [ROLES.SPADM, ROLES.ADM, ROLES.FRT] },
  { label: 'Transactions', path: '/cash-transactions', icon: 'Receipt', roles: [ROLES.SPADM, ROLES.ADM, ROLES.MGR, ROLES.TKT, ROLES.CHK, ROLES.FRT] },
  { label: 'Administration', path: '/admin', icon: 'Settings', roles: [ROLES.SPADM, ROLES.ADM] },
]

/** Actions du menu central mobile (logo) */
export const MOBILE_ACTION_NAV_ITEMS: NavItem[] = [
  { label: 'Tickets', path: '/tickets', icon: 'Ticket', roles: [ROLES.SPADM, ROLES.ADM, ROLES.TKT] },
  { label: 'Check-In', path: '/checkins', icon: 'UserCheck', roles: [ROLES.SPADM, ROLES.ADM, ROLES.CHK] },
  { label: 'Fret', path: '/freight', icon: 'Package', roles: [ROLES.SPADM, ROLES.ADM, ROLES.FRT] },
  { label: 'Transactions', path: '/cash-transactions', icon: 'Receipt', roles: [ROLES.SPADM, ROLES.ADM, ROLES.MGR, ROLES.TKT, ROLES.CHK, ROLES.FRT] },
  { label: 'Administration', path: '/admin', icon: 'Settings', roles: [ROLES.SPADM, ROLES.ADM] },
]

export function getMobileAccueilPath(userRoles: string[]): string {
  if (hasRole(userRoles, [ROLES.SPADM, ROLES.ADM, ROLES.MGR])) return '/dashboard'
  if (hasRole(userRoles, [ROLES.TKT])) return '/tickets'
  if (hasRole(userRoles, [ROLES.CHK])) return '/checkins'
  if (hasRole(userRoles, [ROLES.FRT])) return '/freight'
  return '/profile'
}

export function getMobileActionNavForRoles(userRoles: string[]): NavItem[] {
  return getNavItemsForRoles(userRoles, MOBILE_ACTION_NAV_ITEMS)
}

export function isMobileAccueilActive(pathname: string, accueilPath: string): boolean {
  if (accueilPath === '/dashboard' || accueilPath === '/profile') {
    return pathname === accueilPath
  }
  return pathname === accueilPath || pathname.startsWith(`${accueilPath}/`)
}

export function isMobileActionRouteActive(pathname: string, actionPaths: string[]): boolean {
  return actionPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`) || (path === '/admin' && pathname.startsWith('/admin')),
  )
}

export function hasRole(userRoles: string[], requiredRoles: Role[]): boolean {
  const normalized = new Set(userRoles.map((r) => r.toUpperCase()))
  return requiredRoles.some((role) => {
    const upper = role.toUpperCase()
    const short = upper.replace('ROLE_', '')
    return normalized.has(upper) || normalized.has(short) || normalized.has(`ROLE_${short}`)
  })
}

export function getNavItemsForRoles(userRoles: string[], items: NavItem[]): NavItem[] {
  return items.filter((item) => hasRole(userRoles, item.roles))
}
