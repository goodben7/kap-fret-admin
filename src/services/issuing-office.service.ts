import { api } from './api'
import { extractHydraMember, extractHydraTotalItems, extractIri } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import type {
  IssuingOffice,
  IssuingOfficeCreatePayload,
  IssuingOfficePatchPayload,
} from '@/types/issuing-office'

export interface IssuingOfficeFilters {
  page?: number
  itemsPerPage?: number
  name?: string
  active?: boolean
}

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export const issuingOfficeService = {
  async getAll(filters: IssuingOfficeFilters = {}) {
    const { data } = await api.get<HydraCollection<IssuingOffice>>('/api/issuing_offices', { params: filters })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<IssuingOffice>(`/api/issuing_offices/${id}`)
    return data
  },

  async create(payload: IssuingOfficeCreatePayload) {
    const { data } = await api.post<IssuingOffice>('/api/issuing_offices', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: IssuingOfficePatchPayload) {
    const { data } = await api.patch<IssuingOffice>(`/api/issuing_offices/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}

export function getCheckpointIri(office: IssuingOffice): string {
  return extractIri(office.checkpoint) ?? (typeof office.checkpoint === 'string' ? office.checkpoint : '')
}
