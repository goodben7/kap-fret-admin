import { normalizeIri } from '@/lib/hydra'

export interface CashRegisterFilters {
  page?: number
  itemsPerPage?: number
  code?: string
  name?: string
  active?: boolean
  currency?: string
  issuingOffice?: string
}

export type CashRegisterFiltersState = {
  code: string
  name: string
  active: '' | 'true' | 'false'
  currency: string
}

export const emptyCashRegisterFilters: CashRegisterFiltersState = {
  code: '',
  name: '',
  active: '',
  currency: '',
}

const FILTER_PARAM_KEYS = ['code', 'name', 'active', 'currency'] as const satisfies readonly (keyof CashRegisterFiltersState)[]

function parseActive(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function buildCashRegisterFilterParams(
  filters: CashRegisterFilters,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage

  const code = filters.code?.trim()
  if (code) params.code = code

  const name = filters.name?.trim()
  if (name) params.name = name

  const active = filters.active
  if (active != null) params.active = active

  const currency = filters.currency?.trim()
  if (currency) params.currency = normalizeIri(currency)

  const issuingOffice = filters.issuingOffice?.trim()
  if (issuingOffice) params.issuingOffice = normalizeIri(issuingOffice)

  params['order[createdAt]'] = 'desc'

  return params
}

/** GET collection — filtre issuingOffice uniquement */
export function buildCashRegisterIssuingOfficeOnlyParams(
  issuingOffice: string,
): Record<string, string> {
  return { issuingOffice: normalizeIri(issuingOffice.trim()) }
}

export function cashRegisterFiltersStateToApi(state: CashRegisterFiltersState): CashRegisterFilters {
  return {
    code: state.code.trim() || undefined,
    name: state.name.trim() || undefined,
    active: parseActive(state.active),
    currency: state.currency.trim() || undefined,
  }
}

export function parseCashRegisterFiltersFromSearchParams(
  searchParams: URLSearchParams,
): CashRegisterFiltersState {
  const get = (key: keyof CashRegisterFiltersState) => searchParams.get(key) ?? ''
  const active = get('active')
  return {
    code: get('code'),
    name: get('name'),
    active: active === 'true' || active === 'false' ? active : '',
    currency: get('currency'),
  }
}

export function cashRegisterFiltersToSearchParams(
  filters: CashRegisterFiltersState,
  page?: number,
): URLSearchParams {
  const sp = new URLSearchParams()
  for (const key of FILTER_PARAM_KEYS) {
    const value = filters[key]?.trim()
    if (value) sp.set(key, value)
  }
  if (page != null && page > 1) sp.set('page', String(page))
  return sp
}

export function countActiveCashRegisterFilters(filters: CashRegisterFiltersState): number {
  return FILTER_PARAM_KEYS.filter((key) => Boolean(filters[key]?.trim())).length
}
