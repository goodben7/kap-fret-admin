import { api } from './api'
import { extractHydraMember } from '@/lib/hydra'
import { parseCheckpointMember } from '@/lib/checkpoint'
import type { HydraCollection } from '@/types/hydra'
import type { Checkpoint } from '@/types/checkpoint'
import type { TicketCategoryPrice } from '@/types/ticket-category-price'
import type { TicketCategory } from '@/constants/ticket'

const PUBLIC_HEADERS = {
  Accept: 'application/ld+json',
  'Content-Type': 'application/ld+json',
} as const

export interface PublicReservationPassengerPayload {
  passengerName: string
  category: TicketCategory
  gender: 'M' | 'F'
  birthDate?: string | null
  age?: number | null
  phone?: string | null
}

export interface PublicReservationCreatePayload {
  passengers: PublicReservationPassengerPayload[]
  phone: string
  departure: string
  destination: string
  travelDate: string
  travelTime: string
  currency?: 'USD' | 'CDF'
  website?: string
}

export interface PublicReservationTicket {
  id: string
  ticketNumber: string
  passengerName: string
  category: string
  status: string
  source: string
  totalAmount: string
  currency: string
  phone?: string | null
  travelDate?: string | null
  travelTime?: string | null
  purchaseGroupId?: string | null
  trackingCode?: string | null
}

export interface PublicReservationResult {
  tickets: PublicReservationTicket[]
  purchaseGroupId?: string | null
  trackingCode?: string | null
  count: number
  message?: string
}

export interface PublicReservationLookupPayload {
  phone: string
  trackingCode: string
  website?: string
}

export const publicReservationService = {
  async listCheckpoints(): Promise<Checkpoint[]> {
    const { data } = await api.get<HydraCollection<Checkpoint>>('/api/public/checkpoints', {
      params: { 'order[label]': 'asc' },
      skipAuthRedirect: true,
    })
    return extractHydraMember(data)
      .map(parseCheckpointMember)
      .filter((cp): cp is Checkpoint => cp != null && cp.active !== false)
  },

  async listCategoryPrices(): Promise<TicketCategoryPrice[]> {
    const { data } = await api.get<HydraCollection<TicketCategoryPrice>>(
      '/api/public/ticket_category_prices',
      { skipAuthRedirect: true },
    )
    return extractHydraMember(data).filter((p) => p.active !== false)
  },

  async create(payload: PublicReservationCreatePayload): Promise<PublicReservationResult> {
    const { data } = await api.post<PublicReservationResult>(
      '/api/public/ticket_reservations',
      payload,
      { headers: PUBLIC_HEADERS, skipAuthRedirect: true },
    )
    return data
  },

  async lookup(payload: PublicReservationLookupPayload): Promise<PublicReservationResult> {
    const { data } = await api.post<PublicReservationResult>(
      '/api/public/ticket_reservations/lookup',
      payload,
      { headers: PUBLIC_HEADERS, skipAuthRedirect: true },
    )
    return data
  },
}
