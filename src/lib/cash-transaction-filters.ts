import { normalizeIri } from '@/lib/hydra'
import type { CashTransactionReferenceType, CashTransactionType } from '@/constants/cash-transaction'

export interface CashTransactionFilters {
  page?: number
  itemsPerPage?: number
  id?: string
  cashRegister?: string
  issuingOffice?: string
  type?: CashTransactionType
  referenceType?: CashTransactionReferenceType
  referenceId?: string
  validated?: boolean
  createdBy?: string
  transactionDate?: string
  transactionDateFrom?: string
  transactionDateTo?: string
  createdAt?: string
}

export type CashTransactionFiltersState = {
  id: string
  type: '' | CashTransactionType
  referenceType: '' | CashTransactionReferenceType
  referenceId: string
  cashRegister: string
  validated: '' | 'true' | 'false'
  transactionDate: string
  createdAt: string
}

export const emptyCashTransactionFilters: CashTransactionFiltersState = {
  id: '',
  type: '',
  referenceType: '',
  referenceId: '',
  cashRegister: '',
  validated: '',
  transactionDate: '',
  createdAt: '',
}

const FILTER_PARAM_KEYS = [
  'id',
  'type',
  'referenceType',
  'referenceId',
  'cashRegister',
  'validated',
  'transactionDate',
  'createdAt',
] as const satisfies readonly (keyof CashTransactionFiltersState)[]

function addDay(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function parseValidated(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function buildCashTransactionFilterParams(
  filters: CashTransactionFilters,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage

  const id = filters.id?.trim()
  if (id) params.id = id

  const cashRegister = filters.cashRegister?.trim()
  if (cashRegister) params.cashRegister = normalizeIri(cashRegister)

  const issuingOffice = filters.issuingOffice?.trim()
  if (issuingOffice) params.issuingOffice = normalizeIri(issuingOffice)

  const type = filters.type?.trim()
  if (type) params.type = type

  const referenceType = filters.referenceType?.trim()
  if (referenceType) params.referenceType = referenceType

  const referenceId = filters.referenceId?.trim()
  if (referenceId) params.referenceId = referenceId

  if (filters.validated != null) params.validated = filters.validated

  const createdBy = filters.createdBy?.trim()
  if (createdBy) params.createdBy = normalizeIri(createdBy)

  const transactionDate = filters.transactionDate?.trim()
  if (transactionDate) {
    params['transactionDate[after]'] = `${transactionDate}T00:00:00`
    params['transactionDate[before]'] = `${addDay(transactionDate, 1)}T00:00:00`
  }

  const transactionDateFrom = filters.transactionDateFrom?.trim()
  if (transactionDateFrom) {
    params['transactionDate[after]'] = `${transactionDateFrom}T00:00:00`
  }

  const transactionDateTo = filters.transactionDateTo?.trim()
  if (transactionDateTo) {
    params['transactionDate[before]'] = `${addDay(transactionDateTo, 1)}T00:00:00`
  }

  const createdAt = filters.createdAt?.trim()
  if (createdAt) {
    params['createdAt[after]'] = `${createdAt}T00:00:00`
    params['createdAt[before]'] = `${addDay(createdAt, 1)}T00:00:00`
  }

  params['order[createdAt]'] = 'desc'
  params['order[transactionDate]'] = 'desc'
  params['order[id]'] = 'desc'

  return params
}

export function cashTransactionFiltersStateToApi(
  state: CashTransactionFiltersState,
): Omit<CashTransactionFilters, 'page' | 'itemsPerPage'> {
  return {
    id: state.id.trim() || undefined,
    type: state.type || undefined,
    referenceType: state.referenceType || undefined,
    referenceId: state.referenceId.trim() || undefined,
    cashRegister: state.cashRegister.trim() || undefined,
    validated: parseValidated(state.validated),
    transactionDate: state.transactionDate.trim() || undefined,
    createdAt: state.createdAt.trim() || undefined,
  }
}

export function parseCashTransactionFiltersFromSearchParams(
  searchParams: URLSearchParams,
): CashTransactionFiltersState {
  const get = (key: keyof CashTransactionFiltersState) => searchParams.get(key) ?? ''
  const validated = get('validated')
  const type = get('type')
  const referenceType = get('referenceType')

  return {
    id: get('id'),
    type: type === 'ENTRY' || type === 'EXIT' ? type : '',
    referenceType:
      referenceType === 'TICKET'
      || referenceType === 'CHECKIN'
      || referenceType === 'FREIGHT'
      || referenceType === 'MANUAL'
        ? referenceType
        : '',
    referenceId: get('referenceId'),
    cashRegister: get('cashRegister'),
    validated: validated === 'true' || validated === 'false' ? validated : '',
    transactionDate: get('transactionDate'),
    createdAt: get('createdAt'),
  }
}

export function cashTransactionFiltersToSearchParams(
  filters: CashTransactionFiltersState,
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

export function countActiveCashTransactionFilters(filters: CashTransactionFiltersState): number {
  return FILTER_PARAM_KEYS.filter((key) => Boolean(filters[key]?.trim())).length
}
