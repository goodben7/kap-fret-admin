import { ROLES, type Role } from '@/constants/roles'
import type { AuthUser } from '@/types/auth'

type RawUser = Record<string, unknown>

/** Permissions Symfony → rôles métier front */
const PERMISSION_ROLE_MAP: Record<string, Role> = {
  ROLE_SUPER_ADMIN: ROLES.SPADM,
  ROLE_SPADM: ROLES.SPADM,
  ROLE_ADMIN: ROLES.ADM,
  ROLE_ADM: ROLES.ADM,
  ROLE_TKT: ROLES.TKT,
  ROLE_CHK: ROLES.CHK,
  ROLE_FRT: ROLES.FRT,
  ROLE_MGR: ROLES.MGR,
}

/** personType / profile.label → rôles métier front */
const PERSON_TYPE_MAP: Record<string, Role> = {
  SPADM: ROLES.SPADM,
  ADM: ROLES.ADM,
  TKT: ROLES.TKT,
  CHK: ROLES.CHK,
  FRT: ROLES.FRT,
  MGR: ROLES.MGR,
  ADMIN: ROLES.ADM,
  SUPER_ADMIN: ROLES.SPADM,
}

function pickString(obj: RawUser, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
  }
  return undefined
}

function parseDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/)
  return {
    firstName: parts[0] ?? displayName,
    lastName: parts.slice(1).join(' '),
  }
}

export function normalizeRoles(rawRoles: unknown, raw?: RawUser): Role[] {
  const result = new Set<Role>()

  if (Array.isArray(rawRoles)) {
    for (const rawRole of rawRoles) {
      if (typeof rawRole !== 'string') continue
      const mapped = PERMISSION_ROLE_MAP[rawRole.toUpperCase()]
      if (mapped) result.add(mapped)
    }
  }

  if (raw) {
    const personType = pickString(raw, 'personType', 'person_type')?.toUpperCase()
    if (personType && PERSON_TYPE_MAP[personType]) {
      result.add(PERSON_TYPE_MAP[personType])
    }

    const profile = raw.profile as RawUser | undefined
    const profileLabel = profile ? pickString(profile, 'label')?.toUpperCase() : undefined
    if (profileLabel && PERSON_TYPE_MAP[profileLabel]) {
      result.add(PERSON_TYPE_MAP[profileLabel])
    }
  }

  // Super admin hérite de tous les accès admin
  if (result.has(ROLES.SPADM)) {
    result.add(ROLES.ADM)
  }

  return Array.from(result)
}

function resolveHolder(raw: RawUser): AuthUser['holder'] | undefined {
  const holderId = pickString(raw, 'holderId', 'holder_id')
  const holderType = pickString(raw, 'holderType', 'holder_type')

  if (holderType === 'ISSUING_OFFICE' && holderId) {
    return {
      '@id': `/api/issuing_offices/${holderId}`,
      name: holderId,
    }
  }

  const embedded = raw.holder ?? raw.issuingOffice ?? raw.issuing_office
  if (typeof embedded === 'object' && embedded !== null) {
    const h = embedded as RawUser
    return {
      '@id': (h['@id'] as string) ?? `/api/issuing_offices/${h.id ?? ''}`,
      name: pickString(h, 'name', 'label') ?? holderId ?? '',
    }
  }

  if (typeof embedded === 'string') {
    return { '@id': embedded, name: holderId ?? '' }
  }

  return undefined
}

export function normalizeUser(data: unknown): AuthUser {
  const raw = (data ?? {}) as RawUser

  const displayName = pickString(raw, 'displayName', 'display_name', 'fullName', 'name')
  const firstName = pickString(raw, 'firstName', 'first_name', 'givenName')
  const lastName = pickString(raw, 'lastName', 'last_name', 'familyName', 'surname')

  let resolvedFirst = firstName ?? ''
  let resolvedLast = lastName ?? ''

  if (displayName && !resolvedFirst && !resolvedLast) {
    const parsed = parseDisplayName(displayName)
    resolvedFirst = parsed.firstName
    resolvedLast = parsed.lastName
  }

  if (!resolvedFirst) {
    resolvedFirst = pickString(raw, 'username', 'email') ?? 'Utilisateur'
  }

  const holder = resolveHolder(raw)
  const holderType = pickString(raw, 'holderType', 'holder_type') ?? ''
  const holderId = pickString(raw, 'holderId', 'holder_id')
  const personType = pickString(raw, 'personType', 'person_type')

  const profileRaw = raw.profile as RawUser | undefined
  const profileLabel = profileRaw ? pickString(profileRaw, 'label') : undefined
  const profileId = profileRaw?.id != null ? String(profileRaw.id) : undefined
  const profile =
    profileLabel && profileId
      ? { id: profileId, label: profileLabel }
      : profileLabel
        ? { id: profileId ?? '', label: profileLabel }
        : undefined

  const id = raw.id ?? raw['@id'] ?? ''

  const deleted = raw.deleted === true
  const locked = raw.locked === true

  return {
    '@id': (raw['@id'] as string) ?? `/api/users/${String(id)}`,
    '@type': (raw['@type'] as string) ?? 'User',
    id: typeof id === 'number' || typeof id === 'string' ? id : String(id),
    email: pickString(raw, 'email'),
    phone: pickString(raw, 'phone', 'telephone', 'mobile'),
    displayName,
    firstName: resolvedFirst,
    lastName: resolvedLast,
    personType,
    roles: normalizeRoles(raw.roles, raw),
    holderType,
    holderId,
    holder,
    issuingOffice: holder,
    profile,
    active: !deleted && !locked,
  }
}

export function getDisplayName(user: AuthUser): string {
  if (user.displayName) return user.displayName
  const name = `${user.firstName} ${user.lastName}`.trim()
  return name || user.email || user.phone || 'Utilisateur'
}
