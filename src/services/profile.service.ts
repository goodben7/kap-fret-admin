import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import type { Profile } from '@/types/profile'

export interface ProfileFilters {
  page?: number
  itemsPerPage?: number
  label?: string
  personType?: string
  active?: boolean
}

export interface ProfilePayload {
  label: string
  personType: string
  permission: string[]
  active: boolean
}

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export const profileService = {
  async getAll(filters: ProfileFilters = {}) {
    const { data } = await api.get<HydraCollection<Profile>>('/api/profiles', { params: filters })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<Profile>(`/api/profiles/${id}`)
    return data
  },

  async create(payload: ProfilePayload) {
    const { data } = await api.post<Profile>('/api/profiles', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: Partial<ProfilePayload>) {
    const { data } = await api.patch<Profile>(`/api/profiles/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}
