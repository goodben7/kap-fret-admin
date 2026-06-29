/** Filtres alignés sur Province SearchFilter + DateFilter + OrderFilter */

export interface ProvinceFilters {
  page?: number
  itemsPerPage?: number
  pagination?: boolean
  label?: string
  code?: string
  active?: boolean
  createdAt?: string
}

export type ProvinceFiltersState = {
  label: string
  code: string
  active: '' | 'true' | 'false'
  createdAt: string
}

export const emptyProvinceFilters: ProvinceFiltersState = {
  label: '',
  code: '',
  active: '',
  createdAt: '',
}

const FILTER_PARAM_KEYS = ['label', 'code', 'active', 'createdAt'] as const satisfies readonly (keyof ProvinceFiltersState)[]

function addDay(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function parseActive(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function buildProvinceFilterParams(filters: ProvinceFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage
  if (filters.pagination != null) params.pagination = filters.pagination

  const label = filters.label?.trim()
  if (label) params.label = label

  const code = filters.code?.trim()
  if (code) params.code = code

  if (filters.active != null) params.active = filters.active

  const createdAt = filters.createdAt?.trim()
  if (createdAt) {
    params['createdAt[after]'] = `${createdAt}T00:00:00`
    params['createdAt[before]'] = `${addDay(createdAt, 1)}T00:00:00`
  }

  params['order[createdAt]'] = 'desc'

  return params
}

export function provinceFiltersStateToApi(filters: ProvinceFiltersState): Omit<ProvinceFilters, 'page' | 'itemsPerPage'> {
  return {
    label: filters.label.trim() || undefined,
    code: filters.code.trim() || undefined,
    active: parseActive(filters.active),
    createdAt: filters.createdAt.trim() || undefined,
  }
}

export function parseProvinceFiltersFromSearchParams(searchParams: URLSearchParams): ProvinceFiltersState {
  const active = searchParams.get('active')
  return {
    label: searchParams.get('label') ?? '',
    code: searchParams.get('code') ?? '',
    active: active === 'true' || active === 'false' ? active : '',
    createdAt: searchParams.get('createdAt') ?? '',
  }
}

export function provinceFiltersToSearchParams(
  filters: ProvinceFiltersState,
  page?: number,
): URLSearchParams {
  const sp = new URLSearchParams()
  for (const key of FILTER_PARAM_KEYS) {
    const value = filters[key]
    if (key === 'active') {
      if (value === 'true' || value === 'false') sp.set(key, value)
    } else if (typeof value === 'string' && value.trim()) {
      sp.set(key, value.trim())
    }
  }
  if (page != null && page > 1) sp.set('page', String(page))
  return sp
}

export function countActiveProvinceFilters(filters: ProvinceFiltersState): number {
  let count = 0
  if (filters.label.trim()) count += 1
  if (filters.code.trim()) count += 1
  if (filters.active === 'true' || filters.active === 'false') count += 1
  if (filters.createdAt.trim()) count += 1
  return count
}
