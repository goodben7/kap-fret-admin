import { extractResourceId } from '@/lib/hydra'

/** Filtres alignés sur Checkpoint SearchFilter + OrderFilter */

export interface CheckpointFilters {
  page?: number
  itemsPerPage?: number
  pagination?: boolean
  label?: string
  id?: string
  active?: boolean
  'province.id'?: string
  'province.code'?: string
}

export type CheckpointFiltersState = {
  label: string
  active: '' | 'true' | 'false'
  /** IRI province (UI) → province.id (API) */
  province: string
}

export const emptyCheckpointFilters: CheckpointFiltersState = {
  label: '',
  active: '',
  province: '',
}

const FILTER_PARAM_KEYS = ['label', 'active', 'province'] as const satisfies readonly (keyof CheckpointFiltersState)[]

function parseActive(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function buildCheckpointFilterParams(
  filters: CheckpointFilters,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage
  if (filters.pagination != null) params.pagination = filters.pagination

  if (filters.id) params.id = filters.id

  const label = filters.label?.trim()
  if (label) params.label = label

  if (filters.active != null) params.active = filters.active

  if (filters['province.id']) params['province.id'] = filters['province.id']
  if (filters['province.code']) params['province.code'] = filters['province.code']

  params['order[label]'] = 'asc'

  return params
}

export function checkpointFiltersStateToApi(
  filters: CheckpointFiltersState,
): Omit<CheckpointFilters, 'page' | 'itemsPerPage' | 'pagination'> {
  const provinceId = filters.province.trim()
    ? extractResourceId(filters.province.trim()) ?? undefined
    : undefined

  return {
    label: filters.label.trim() || undefined,
    active: parseActive(filters.active),
    'province.id': provinceId,
  }
}

export function parseCheckpointFiltersFromSearchParams(searchParams: URLSearchParams): CheckpointFiltersState {
  const active = searchParams.get('active')
  return {
    label: searchParams.get('label') ?? '',
    active: active === 'true' || active === 'false' ? active : '',
    province: searchParams.get('province') ?? '',
  }
}

export function checkpointFiltersToSearchParams(
  filters: CheckpointFiltersState,
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

export function countActiveCheckpointFilters(filters: CheckpointFiltersState): number {
  let count = 0
  if (filters.label.trim()) count += 1
  if (filters.active === 'true' || filters.active === 'false') count += 1
  if (filters.province.trim()) count += 1
  return count
}
