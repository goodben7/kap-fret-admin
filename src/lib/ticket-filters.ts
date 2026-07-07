import { normalizeIri } from '@/lib/hydra'
import { parseCurrencyFilter } from '@/constants/ticket'

/** DateFilter API Platform — filtre sur un jour (YYYY-MM-DD) */
function addDay(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function appendTravelDateFilter(params: Record<string, string | number>, travelDate: string) {
  const day = travelDate.trim()
  if (!day) return
  params['travelDate[after]'] = `${day}T00:00:00.000Z`
  params['travelDate[before]'] = `${addDay(day, 1)}T00:00:00.000Z`
}

export interface TicketFilters {
  page?: number
  itemsPerPage?: number
  ticketNumber?: string
  passengerName?: string
  phone?: string
  gender?: string
  departure?: string
  destination?: string
  travelDate?: string
  status?: string
  paymentMode?: string
  currency?: string
}

export type TicketFiltersState = Required<
  Pick<
    TicketFilters,
    | 'ticketNumber'
    | 'passengerName'
    | 'phone'
    | 'gender'
    | 'departure'
    | 'destination'
    | 'travelDate'
    | 'status'
    | 'paymentMode'
    | 'currency'
  >
>

export const emptyTicketFilters: TicketFiltersState = {
  ticketNumber: '',
  passengerName: '',
  phone: '',
  gender: '',
  departure: '',
  destination: '',
  travelDate: '',
  status: '',
  paymentMode: '',
  currency: '',
}

const FILTER_PARAM_KEYS = [
  'ticketNumber',
  'passengerName',
  'phone',
  'gender',
  'departure',
  'destination',
  'travelDate',
  'status',
  'paymentMode',
  'currency',
] as const satisfies readonly (keyof TicketFiltersState)[]

export function buildTicketFilterParams(filters: TicketFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage

  const ticketNumber = filters.ticketNumber?.trim()
  if (ticketNumber) params.ticketNumber = ticketNumber

  const passengerName = filters.passengerName?.trim()
  if (passengerName) params.passengerName = passengerName

  const phone = filters.phone?.trim()
  if (phone) params.phone = phone

  if (filters.travelDate?.trim()) appendTravelDateFilter(params, filters.travelDate)

  if (filters.status?.trim()) params.status = filters.status.trim()
  if (filters.gender?.trim()) params.gender = filters.gender.trim()
  if (filters.paymentMode?.trim()) params.paymentMode = filters.paymentMode.trim()

  const currency = parseCurrencyFilter(filters.currency ?? '')
  if (currency) params.currency = currency

  if (filters.departure?.trim()) params.departure = normalizeIri(filters.departure.trim())
  if (filters.destination?.trim()) params.destination = normalizeIri(filters.destination.trim())

  params['order[createdAt]'] = 'desc'

  return params
}

export function buildTicketQueryString(filters: TicketFilters): string {
  const params = buildTicketFilterParams(filters)
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value))
  }
  return search.toString()
}

export function parseTicketFiltersFromSearchParams(searchParams: URLSearchParams): TicketFiltersState {
  const get = (key: keyof TicketFiltersState) => searchParams.get(key) ?? ''
  return {
    ticketNumber: get('ticketNumber'),
    passengerName: get('passengerName'),
    phone: get('phone'),
    gender: get('gender'),
    departure: get('departure'),
    destination: get('destination'),
    travelDate: get('travelDate'),
    status: get('status'),
    paymentMode: get('paymentMode'),
    currency: parseCurrencyFilter(get('currency')),
  }
}

export function ticketFiltersToSearchParams(
  filters: TicketFiltersState,
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

export function countActiveTicketFilters(filters: TicketFiltersState): number {
  return FILTER_PARAM_KEYS.filter((key) => Boolean(filters[key]?.trim())).length
}

export function ticketFiltersKey(filters: TicketFilters): string {
  return buildTicketQueryString(filters)
}
