import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { filterTicketsByTravelDateInput, filterTicketsForList } from '@/lib/ticket'
import { orderTicketsByCheckInRegistration } from '@/lib/ticket-check-in-order'
import { buildTicketFilterParams, type TicketFilters } from '@/lib/ticket-filters'
import type { HydraCollection } from '@/types/hydra'
import type { Ticket, TicketCreatePayload, TicketStatusPayload, TicketPatchPayload, TicketReportTravelDatePayload, TicketPaymentPayload } from '@/types/ticket'
import { TICKET_STATUS, type TicketStatus } from '@/constants/ticket'

export type { TicketFilters } from '@/lib/ticket-filters'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

const TRAVEL_DATE_FETCH_CAP = 500

function shouldIncludeInactiveTickets(status?: string): boolean {
  const trimmed = status?.trim()
  return trimmed === TICKET_STATUS.CANCELLED || trimmed === TICKET_STATUS.REFUNDED
}

export const ticketService = {
  async getAll(filters: TicketFilters = {}) {
    const travelDay = filters.travelDate?.trim()
    const page = filters.page ?? 1
    const itemsPerPage = filters.itemsPerPage ?? 15
    const includeInactive = shouldIncludeInactiveTickets(filters.status)

    const requestFilters: TicketFilters = travelDay
      ? { ...filters, page: 1, itemsPerPage: TRAVEL_DATE_FETCH_CAP }
      : filters

    const params = buildTicketFilterParams(requestFilters)
    const { data } = await api.get<HydraCollection<Ticket>>('/api/tickets', { params })
    const rawItems = extractHydraMember(data)
    let items = rawItems

    if (travelDay) {
      items = filterTicketsByTravelDateInput(items, travelDay)
    }

    if (!includeInactive) {
      items = filterTicketsForList(items)
    }

    if (travelDay) {
      items = await orderTicketsByCheckInRegistration(items, travelDay, {
        departure: filters.departure,
        destination: filters.destination,
      })
      const start = (page - 1) * itemsPerPage
      return {
        items: items.slice(start, start + itemsPerPage),
        totalItems: items.length,
      }
    }

    const removedOnPage = rawItems.length - items.length
    return {
      items,
      totalItems: Math.max(0, extractHydraTotalItems(data) - removedOnPage),
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
