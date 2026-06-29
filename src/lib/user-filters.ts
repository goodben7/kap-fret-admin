import { normalizeIri } from '@/lib/hydra'

/** Filtres alignés sur User SearchFilter + DateFilter + OrderFilter */

export interface UserFilters {
  page?: number
  itemsPerPage?: number
  displayName?: string
  email?: string
  phone?: string
  locked?: boolean
  profile?: string
  createdAt?: string
  /** Filtres internes (ex. findOfficeAdmin) */
  holderId?: string
  holderType?: string
  personType?: string
  deleted?: boolean
}

export type UserFiltersState = {
  displayName: string
  email: string
  phone: string
  locked: '' | 'true' | 'false'
  profile: string
  createdAt: string
}

export const emptyUserFilters: UserFiltersState = {
  displayName: '',
  email: '',
  phone: '',
  locked: '',
  profile: '',
  createdAt: '',
}

const FILTER_PARAM_KEYS = [
  'displayName',
  'email',
  'phone',
  'locked',
  'profile',
  'createdAt',
] as const satisfies readonly (keyof UserFiltersState)[]

function addDay(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function parseLocked(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function buildUserFilterParams(filters: UserFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage

  const displayName = filters.displayName?.trim()
  if (displayName) params.displayName = displayName

  const email = filters.email?.trim()
  if (email) params.email = email

  const phone = filters.phone?.trim()
  if (phone) params.phone = phone

  if (filters.locked != null) params.locked = filters.locked

  if (filters.profile?.trim()) {
    params.profile = normalizeIri(filters.profile.trim())
  }

  const createdAt = filters.createdAt?.trim()
  if (createdAt) {
    params['createdAt[after]'] = `${createdAt}T00:00:00`
    params['createdAt[before]'] = `${addDay(createdAt, 1)}T00:00:00`
  }

  if (filters.holderId?.trim()) params.holderId = filters.holderId.trim()
  if (filters.holderType?.trim()) params.holderType = filters.holderType.trim()
  if (filters.personType?.trim()) params.personType = filters.personType.trim()
  if (filters.deleted != null) params.deleted = filters.deleted

  params['order[createdAt]'] = 'desc'

  return params
}

export function userFiltersStateToApi(filters: UserFiltersState): Omit<UserFilters, 'page' | 'itemsPerPage'> {
  return {
    displayName: filters.displayName.trim() || undefined,
    email: filters.email.trim() || undefined,
    phone: filters.phone.trim() || undefined,
    locked: parseLocked(filters.locked),
    profile: filters.profile.trim() || undefined,
    createdAt: filters.createdAt.trim() || undefined,
  }
}

export function parseUserFiltersFromSearchParams(searchParams: URLSearchParams): UserFiltersState {
  const locked = searchParams.get('locked')
  return {
    displayName: searchParams.get('displayName') ?? '',
    email: searchParams.get('email') ?? '',
    phone: searchParams.get('phone') ?? '',
    locked: locked === 'true' || locked === 'false' ? locked : '',
    profile: searchParams.get('profile') ?? '',
    createdAt: searchParams.get('createdAt') ?? '',
  }
}

export function userFiltersToSearchParams(
  filters: UserFiltersState,
  page?: number,
): URLSearchParams {
  const sp = new URLSearchParams()
  for (const key of FILTER_PARAM_KEYS) {
    const value = filters[key]
    if (key === 'locked') {
      if (value === 'true' || value === 'false') sp.set(key, value)
    } else if (typeof value === 'string' && value.trim()) {
      sp.set(key, value.trim())
    }
  }
  if (page != null && page > 1) sp.set('page', String(page))
  return sp
}

export function countActiveUserFilters(filters: UserFiltersState): number {
  return FILTER_PARAM_KEYS.filter((key) => {
    const value = filters[key]
    if (key === 'locked') return value === 'true' || value === 'false'
    return typeof value === 'string' && Boolean(value.trim())
  }).length
}
