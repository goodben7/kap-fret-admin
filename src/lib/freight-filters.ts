import { normalizeIri } from '@/lib/hydra'
import { parseCurrencyFilter } from '@/constants/ticket'

/** Filtres alignés sur Freight SearchFilter + DateFilter + OrderFilter */

export interface FreightFilters {
  page?: number
  itemsPerPage?: number
  ltaNumber?: string
  airline?: string
  status?: string
  paymentMode?: string
  currency?: string
  shipmentDate?: string
  senderName?: string
  receiverName?: string
  loadingPlace?: string
  unloadingPlace?: string
}

export type FreightFiltersState = Required<
  Pick<
    FreightFilters,
    | 'ltaNumber'
    | 'airline'
    | 'status'
    | 'paymentMode'
    | 'currency'
    | 'shipmentDate'
    | 'senderName'
    | 'receiverName'
    | 'loadingPlace'
    | 'unloadingPlace'
  >
>

export const emptyFreightFilters: FreightFiltersState = {
  ltaNumber: '',
  airline: '',
  status: '',
  paymentMode: '',
  currency: '',
  shipmentDate: '',
  senderName: '',
  receiverName: '',
  loadingPlace: '',
  unloadingPlace: '',
}

const FILTER_PARAM_KEYS = [
  'ltaNumber',
  'airline',
  'status',
  'paymentMode',
  'currency',
  'shipmentDate',
  'senderName',
  'receiverName',
  'loadingPlace',
  'unloadingPlace',
] as const satisfies readonly (keyof FreightFiltersState)[]

function addDay(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildFreightFilterParams(filters: FreightFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage

  const ltaNumber = filters.ltaNumber?.trim()
  if (ltaNumber) params.ltaNumber = ltaNumber

  const airline = filters.airline?.trim()
  if (airline) params.airline = airline

  const status = filters.status?.trim()
  if (status) params.status = status

  const paymentMode = filters.paymentMode?.trim()
  if (paymentMode) params.paymentMode = paymentMode

  const currency = parseCurrencyFilter(filters.currency ?? '')
  if (currency) params.currency = currency

  const senderName = filters.senderName?.trim()
  if (senderName) params.senderName = senderName

  const receiverName = filters.receiverName?.trim()
  if (receiverName) params.receiverName = receiverName

  const shipmentDate = filters.shipmentDate?.trim()
  if (shipmentDate) {
    params['shipmentDate[after]'] = `${shipmentDate}T00:00:00`
    params['shipmentDate[before]'] = `${addDay(shipmentDate, 1)}T00:00:00`
  }

  if (filters.loadingPlace?.trim()) {
    params.loadingPlace = normalizeIri(filters.loadingPlace.trim())
  }
  if (filters.unloadingPlace?.trim()) {
    params.unloadingPlace = normalizeIri(filters.unloadingPlace.trim())
  }

  params['order[createdAt]'] = 'desc'
  params['order[shipmentDate]'] = 'desc'
  params['order[id]'] = 'desc'

  return params
}

export function parseFreightFiltersFromSearchParams(searchParams: URLSearchParams): FreightFiltersState {
  const get = (key: keyof FreightFiltersState) => searchParams.get(key) ?? ''
  return {
    ltaNumber: get('ltaNumber'),
    airline: get('airline'),
    status: get('status'),
    paymentMode: get('paymentMode'),
    currency: parseCurrencyFilter(get('currency')),
    shipmentDate: get('shipmentDate'),
    senderName: get('senderName'),
    receiverName: get('receiverName'),
    loadingPlace: get('loadingPlace'),
    unloadingPlace: get('unloadingPlace'),
  }
}

export function freightFiltersToSearchParams(
  filters: FreightFiltersState,
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

export function countActiveFreightFilters(filters: FreightFiltersState): number {
  return FILTER_PARAM_KEYS.filter((key) => Boolean(filters[key]?.trim())).length
}

export function buildFreightManifestFilters(
  loadingPlace: string,
  unloadingPlace: string,
  shipmentDate: string,
): FreightFilters {
  return {
    loadingPlace,
    unloadingPlace,
    shipmentDate,
    itemsPerPage: 500,
    page: 1,
  }
}
