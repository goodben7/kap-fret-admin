import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import type {
  ExchangeRateCreatePayload,
  ExchangeRatePatchPayload,
  ExchangeRateResource,
} from '@/types/exchange-rate'

export interface ExchangeRateFilters {
  page?: number
  itemsPerPage?: number
  pagination?: boolean
}

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export const exchangeRateService = {
  async getAll(filters: ExchangeRateFilters = {}) {
    const params: Record<string, string | number | boolean> = {}
    if (filters.page != null && filters.page > 0) params.page = filters.page
    if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage
    if (filters.pagination != null) params.pagination = filters.pagination

    const { data } = await api.get<HydraCollection<ExchangeRateResource>>('/api/exchange_rates', { params })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<ExchangeRateResource>(`/api/exchange_rates/${id}`)
    return data
  },

  async create(payload: ExchangeRateCreatePayload) {
    const { data } = await api.post<ExchangeRateResource>('/api/exchange_rates', payload, {
      headers: JSON_HEADERS,
    })
    return data
  },

  async update(id: string, payload: ExchangeRatePatchPayload) {
    const { data } = await api.patch<ExchangeRateResource>(`/api/exchange_rates/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },

  async delete(id: string) {
    await api.delete(`/api/exchange_rates/${id}`)
  },
}
