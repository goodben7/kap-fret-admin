import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import type { CurrencyPayload, CurrencyResource } from '@/types/currency-resource'

export interface CurrencyFilters {
  page?: number
  itemsPerPage?: number
  pagination?: boolean
}

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export const currencyService = {
  async getAll(filters: CurrencyFilters = {}) {
    const params: Record<string, string | number | boolean> = {}
    if (filters.page != null && filters.page > 0) params.page = filters.page
    if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage
    if (filters.pagination != null) params.pagination = filters.pagination

    const { data } = await api.get<HydraCollection<CurrencyResource>>('/api/currencies', { params })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getAllForSelect() {
    const { data } = await api.get<HydraCollection<CurrencyResource>>('/api/currencies', {
      params: { pagination: false },
    })
    return extractHydraMember(data)
  },

  async getById(id: string) {
    const { data } = await api.get<CurrencyResource>(`/api/currencies/${id}`)
    return data
  },

  async create(payload: CurrencyPayload) {
    const { data } = await api.post<CurrencyResource>('/api/currencies', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: CurrencyPayload) {
    const { data } = await api.patch<CurrencyResource>(`/api/currencies/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}
