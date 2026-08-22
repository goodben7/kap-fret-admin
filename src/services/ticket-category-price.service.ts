import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import type {
  TicketCategoryPrice,
  TicketCategoryPriceCreatePayload,
  TicketCategoryPricePatchPayload,
} from '@/types/ticket-category-price'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export const ticketCategoryPriceService = {
  async getAll(params: { active?: boolean; pagination?: boolean } = {}) {
    const query: Record<string, string | number | boolean> = {
      itemsPerPage: 50,
      page: 1,
    }
    if (params.active != null) query.active = params.active
    if (params.pagination === false) query.pagination = false

    const { data } = await api.get<HydraCollection<TicketCategoryPrice>>('/api/ticket_category_prices', {
      params: query,
    })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<TicketCategoryPrice>(`/api/ticket_category_prices/${id}`)
    return data
  },

  async create(payload: TicketCategoryPriceCreatePayload) {
    const { data } = await api.post<TicketCategoryPrice>('/api/ticket_category_prices', payload, {
      headers: JSON_HEADERS,
    })
    return data
  },

  async update(id: string, payload: TicketCategoryPricePatchPayload) {
    const { data } = await api.patch<TicketCategoryPrice>(`/api/ticket_category_prices/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}
