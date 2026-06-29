import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import type { CheckInBaggage, CheckInBaggagePatchPayload } from '@/types/check-in'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/merge-patch+json',
} as const

export interface CheckInBaggageFilters {
  id?: string
  checkIn?: string
  'checkIn.id'?: string
  order?: Record<string, 'asc' | 'desc'>
}

function buildCheckInBaggageFilterParams(filters: CheckInBaggageFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.id) params.id = filters.id
  if (filters.checkIn) params.checkIn = filters.checkIn
  if (filters['checkIn.id']) params['checkIn.id'] = filters['checkIn.id']
  if (filters.order) {
    for (const [field, direction] of Object.entries(filters.order)) {
      params[`order[${field}]`] = direction
    }
  }
  return params
}

export const checkInBaggageService = {
  async getAll(filters: CheckInBaggageFilters = {}) {
    const { data } = await api.get<HydraCollection<CheckInBaggage>>('/api/check_in_baggages', {
      params: buildCheckInBaggageFilterParams(filters),
    })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<CheckInBaggage>(`/api/check_in_baggages/${id}`)
    return data
  },

  async update(id: string, payload: CheckInBaggagePatchPayload) {
    const { data } = await api.patch<CheckInBaggage>(`/api/check_in_baggages/${id}`, payload, {
      headers: JSON_HEADERS,
    })
    return data
  },
}
