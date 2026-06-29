import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { buildProvinceFilterParams, type ProvinceFilters } from '@/lib/province-filters'
import type { HydraCollection } from '@/types/hydra'
import type { Province, ProvincePayload } from '@/types/province'

export type { ProvinceFilters } from '@/lib/province-filters'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export const provinceService = {
  async getAll(filters: ProvinceFilters = {}) {
    const { data } = await api.get<HydraCollection<Province>>('/api/provinces', {
      params: buildProvinceFilterParams(filters),
    })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getAllForSelect() {
    const { data } = await api.get<HydraCollection<Province>>('/api/provinces', {
      params: { pagination: false },
    })
    return extractHydraMember(data)
  },

  /** Liste pour select : toutes les provinces, filtre ipartial sur label/code */
  async searchForSelect(search: string) {
    const query = search.trim()
    const { items } = await this.getAll({
      pagination: false,
      ...(query ? { label: query } : {}),
    })

    if (!query) return items

    const q = query.toLowerCase()
    return items.filter(
      (p) => p.label.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    )
  },

  async getById(id: string) {
    const { data } = await api.get<Province>(`/api/provinces/${id}`)
    return data
  },

  async create(payload: ProvincePayload) {
    const { data } = await api.post<Province>('/api/provinces', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: Partial<ProvincePayload>) {
    const { data } = await api.patch<Province>(`/api/provinces/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}
