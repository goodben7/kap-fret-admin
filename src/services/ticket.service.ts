import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { filterTicketsByTravelDateInput } from '@/lib/ticket'
import { buildTicketFilterParams, type TicketFilters } from '@/lib/ticket-filters'
import type { HydraCollection } from '@/types/hydra'
import type { Ticket, TicketCreatePayload, TicketStatusPayload, TicketPatchPayload, TicketReportTravelDatePayload, TicketPaymentPayload } from '@/types/ticket'
import type { TicketStatus } from '@/constants/ticket'

export type { TicketFilters } from '@/lib/ticket-filters'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

const TRAVEL_DATE_FETCH_CAP = 500

export const ticketService = {
  async getAll(filters: TicketFilters = {}) {
    const travelDay = filters.travelDate?.trim()
    const page = filters.page ?? 1
    const itemsPerPage = filters.itemsPerPage ?? 15

    const requestFilters: TicketFilters = travelDay
      ? { ...filters, page: 1, itemsPerPage: TRAVEL_DATE_FETCH_CAP }
      : filters

    const params = buildTicketFilterParams(requestFilters)
    const { data } = await api.get<HydraCollection<Ticket>>('/api/tickets', { params })
    let items = extractHydraMember(data)

    if (travelDay) {
      items = filterTicketsByTravelDateInput(items, travelDay)
      const start = (page - 1) * itemsPerPage
      return {
        items: items.slice(start, start + itemsPerPage),
        totalItems: items.length,
      }
    }

    return {
      items,
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<Ticket>(`/api/tickets/${id}`)
    return data
  },

  async create(payload: TicketCreatePayload) {
    const { data } = await api.post<Ticket>('/api/tickets', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: TicketPatchPayload) {
    const { data } = await api.patch<Ticket>(`/api/tickets/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },

  async updateStatus(id: string, status: TicketStatus) {
    const body: TicketStatusPayload = { status }
    const { data } = await api.post<Ticket>(`/api/tickets/${id}/status`, body, {
      headers: JSON_HEADERS,
    })
    return data
  },

  async reportTravelDate(id: string, payload: TicketReportTravelDatePayload) {
    const { data } = await api.post<Ticket>(`/api/tickets/${id}/travel-date`, payload, {
      headers: JSON_HEADERS,
    })
    return data
  },

  async pay(id: string, payload: TicketPaymentPayload) {
    const { data } = await api.post<Ticket>(`/api/tickets/${id}/payment`, payload, {
      headers: JSON_HEADERS,
    })
    return data
  },
}
