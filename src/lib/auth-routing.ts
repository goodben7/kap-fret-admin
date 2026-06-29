import { ROLES, hasRole } from '@/constants/roles'
import type { AuthUser } from '@/types/auth'

export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  return !!user && hasRole(user.roles, [ROLES.SPADM])
}

/** Route par défaut après connexion selon le rôle principal */
export function getHomeRouteForUser(user: AuthUser): string {
  const roles = user.roles

  if (isSuperAdmin(user)) return '/admin/setup'
  if (hasRole(roles, [ROLES.ADM, ROLES.MGR])) return '/dashboard'
  if (hasRole(roles, [ROLES.TKT])) return '/tickets'
  if (hasRole(roles, [ROLES.CHK])) return '/checkins'
  if (hasRole(roles, [ROLES.FRT])) return '/freight'

  return '/profile'
}
