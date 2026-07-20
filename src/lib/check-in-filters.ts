/** Filtres alignés sur CheckIn SearchFilter + DateFilter + OrderFilter (API Platform) */

import { CHECK_IN_STATUS } from '@/constants/check-in'
import { parseCurrencyFilter } from '@/constants/ticket'
import { normalizeIri } from '@/lib/hydra'

export type CheckInOrderField =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'cancelledAt'
  | 'checkInWeight'
  | 'ticket.passengerName'
  | 'netToPay'
  | 'ticket.travelDate'

export interface CheckInFilters {
  page?: number
  itemsPerPage?: number
  /** SearchFilter exact */
  id?: string
  /** SearchFilter exact */
  ticket?: string
  /** SearchFilter exact */
  issuingOffice?: string
  /** SearchFilter ipartial */
  issuingOfficeName?: string
  /** SearchFilter exact → ticket.ticketNumber */
  ticketNumber?: string
  /** SearchFilter ipartial → ticket.passengerName */
  passengerName?: string
  /** SearchFilter exact → ticket.departure */
  departure?: string
  /** SearchFilter exact → ticket.destination */
  destination?: string
  /** SearchFilter exact */
  currency?: string
  /** SearchFilter exact */
  status?: string
  /** DateFilter createdAt (jour unique) */
  createdAt?: string
  /** DateFilter ticket.travelDate (jour unique) */
  travelDate?: string
  orderField?: CheckInOrderField
  orderDirection?: 'asc' | 'desc'
}

export type CheckInFiltersState = Required<
  Pick<
    CheckInFilters,
    | 'ticketNumber'
    | 'passengerName'
    | 'departure'
    | 'destination'
    | 'createdAt'
    | 'travelDate'
    | 'currency'
    | 'status'
  >
>

export const emptyCheckInFilters: CheckInFiltersState = {
  ticketNumber: '',
  passengerName: '',
  departure: '',
  destination: '',
  createdAt: '',
  travelDate: '',
  currency: '',
  status: '',
}

const FILTER_PARAM_KEYS = [
  'ticketNumber',
  'passengerName',
  'departure',
  'destination',
  'createdAt',
  'travelDate',
  'currency',
  'status',
] as const satisfies readonly (keyof CheckInFiltersState)[]

function addDay(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0] ?? isoDate
}

/** DateFilter API Platform — filtre sur un jour (YYYY-MM-DD) */
export function appendApiPlatformDateDayFilter(
  params: Record<string, string | number>,
  property: string,
  day: string,
) {
  const trimmed = day.trim()
  if (!trimmed) return
  params[`${property}[after]`] = `${trimmed}T00:00:00`
  params[`${property}[before]`] = `${addDay(trimmed, 1)}T00:00:00`
}

export function buildCheckInFilterParams(filters: CheckInFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage

  const id = filters.id?.trim()
  if (id) params.id = id

  const ticket = filters.ticket?.trim()
  if (ticket) params.ticket = normalizeIri(ticket)

  const issuingOffice = filters.issuingOffice?.trim()
  if (issuingOffice) params.issuingOffice = normalizeIri(issuingOffice)

  const issuingOfficeName = filters.issuingOfficeName?.trim()
  if (issuingOfficeName) params['issuingOffice.name'] = issuingOfficeName

  const ticketNumber = filters.ticketNumber?.trim()
  if (ticketNumber) params['ticket.ticketNumber'] = ticketNumber

  const passengerName = filters.passengerName?.trim()
  if (passengerName) params['ticket.passengerName'] = passengerName

  const departure = filters.departure?.trim()
  if (departure) params['ticket.departure'] = normalizeIri(departure)

  const destination = filters.destination?.trim()
  if (destination) params['ticket.destination'] = normalizeIri(destination)

  const currency = parseCurrencyFilter(filters.currency ?? '')
  if (currency) params.currency = currency

  const status = filters.status?.trim()
  if (status) params.status = status

  if (filters.createdAt?.trim()) {
    appendApiPlatformDateDayFilter(params, 'createdAt', filters.createdAt)
  }

  if (filters.travelDate?.trim()) {
    appendApiPlatformDateDayFilter(params, 'ticket.travelDate', filters.travelDate)
  }

  appendCheckInOrderParams(params, filters)

  return params
}

/** order[property]=asc|desc — API Platform OrderFilter */
export function appendCheckInOrderParams(
  params: Record<string, string | number>,
  filters: Pick<CheckInFilters, 'orderField' | 'orderDirection'>,
) {
  const direction = filters.orderDirection ?? 'desc'

  if (filters.orderField) {
    params[`order[${filters.orderField}]`] = direction
    if (filters.orderField !== 'id') {
      params['order[id]'] = direction
    }
    return
  }

  params['order[createdAt]'] = 'desc'
  params['order[id]'] = 'desc'
}

/** Sérialise les paramètres API Platform (préserve order[createdAt], ticket.travelDate[after], etc.) */
export function serializeCheckInFilterParams(params: Record<string, string | number>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value))
  }
  return search.toString()
}

export const DEFAULT_CHECK_IN_LIST_ORDER = {
  orderField: 'createdAt',
  orderDirection: 'asc',
} as const satisfies Pick<CheckInFilters, 'orderField' | 'orderDirection'>

export function buildCheckInManifestFilters(
  departure: string,
  destination: string,
  travelDate: string,
): CheckInFilters {
  return {
    departure,
    destination,
    travelDate,
    status: CHECK_IN_STATUS.CREATED,
    itemsPerPage: 500,
    page: 1,
    orderField: 'createdAt',
    orderDirection: 'asc',
  }
}

export function parseCheckInFiltersFromSearchParams(searchParams: URLSearchParams): CheckInFiltersState {
  const get = (key: keyof CheckInFiltersState) => searchParams.get(key) ?? ''
  return {
    ticketNumber: get('ticketNumber'),
    passengerName: get('passengerName'),
    departure: get('departure'),
    destination: get('destination'),
    createdAt: get('createdAt'),
    travelDate: get('travelDate'),
    currency: parseCurrencyFilter(get('currency')),
    status: get('status'),
  }
}

export function checkInFiltersToSearchParams(
  filters: CheckInFiltersState,
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

export function countActiveCheckInFilters(filters: CheckInFiltersState): number {
  return FILTER_PARAM_KEYS.filter((key) => Boolean(filters[key]?.trim())).length
}

export function checkInFiltersKey(filters: CheckInFilters): string {
  return JSON.stringify(buildCheckInFilterParams(filters))
}
