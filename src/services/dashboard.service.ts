import { api } from './api'
import { extractHydraMember } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import { getTicketTotal } from '@/lib/ticket'
import type { DashboardStats, Ticket, FreightShipment } from '@/types/entities'

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

function addDay(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0] ?? isoDate
}

export interface RecentActivityFilters {
  startDate?: string
  endDate?: string
}

function appendCreatedAtRange(
  params: Record<string, string | number>,
  filters?: RecentActivityFilters,
) {
  if (!filters?.startDate?.trim() || !filters?.endDate?.trim()) return
  params['createdAt[after]'] = `${filters.startDate.trim()}T00:00:00`
  params['createdAt[before]'] = `${addDay(filters.endDate.trim(), 1)}T00:00:00`
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const today = getTodayDate()

    const [ticketsRes, checkInsRes, shipmentsRes] = await Promise.all([
      api.get<HydraCollection<Ticket>>('/api/tickets', {
        params: {
          'travelDate[after]': `${today}T00:00:00`,
          'travelDate[before]': `${addDay(today, 1)}T00:00:00`,
          itemsPerPage: 100,
        },
      }),
      api.get<HydraCollection<unknown>>('/api/check_ins', {
        params: { 'createdAt[after]': today, itemsPerPage: 100 },
      }),
      api.get<HydraCollection<FreightShipment>>('/api/freight_shipments', {
        params: { shipmentDate: today, itemsPerPage: 100 },
      }),
    ])

    const tickets = extractHydraMember(ticketsRes.data)
    const checkIns = extractHydraMember(checkInsRes.data)
    const shipments = extractHydraMember(shipmentsRes.data)

    const ticketRevenue = tickets.reduce((sum, t) => sum + getTicketTotal(t), 0)
    const freightRevenue = shipments.reduce((sum, s) => sum + (parseFloat(s.paidAmount) || 0), 0)

    return {
      ticketsToday: tickets.length,
      checkInsToday: checkIns.length,
      shipmentsToday: shipments.length,
      revenueToday: ticketRevenue + freightRevenue,
    }
  },

  async getRecentTickets(limit = 5, filters?: RecentActivityFilters): Promise<Ticket[]> {
    const params: Record<string, string | number> = {
      itemsPerPage: limit,
      'order[createdAt]': 'desc',
    }
    appendCreatedAtRange(params, filters)
    const { data } = await api.get<HydraCollection<Ticket>>('/api/tickets', { params })
    return extractHydraMember(data)
  },

  async getRecentShipments(limit = 5, filters?: RecentActivityFilters): Promise<FreightShipment[]> {
    const params: Record<string, string | number> = {
      itemsPerPage: limit,
      'order[createdAt]': 'desc',
    }
    appendCreatedAtRange(params, filters)
    const { data } = await api.get<HydraCollection<FreightShipment>>('/api/freight_shipments', { params })
    return extractHydraMember(data)
  },
}
