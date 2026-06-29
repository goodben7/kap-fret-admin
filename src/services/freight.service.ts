import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { buildFreightFilterParams, type FreightFilters } from '@/lib/freight-filters'
import { sortFreightShipmentsByNewestFirst } from '@/lib/freight'
import type { HydraCollection } from '@/types/hydra'
import type {
  FreightPackage,
  FreightShipment,
  FreightShipmentCreatePayload,
  FreightShipmentPatchPayload,
  FreightPackagePatchPayload,
  FreightStatusPayload,
} from '@/types/freight-shipment'
import type { FreightStatus } from '@/constants/freight'

export type { FreightFilters } from '@/lib/freight-filters'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

/** Au-delà de cette limite, on s'appuie sur le tri API + pagination serveur */
const CLIENT_SORT_MAX_ITEMS = 500

async function fetchFreightCollection(
  filters: FreightFilters,
): Promise<HydraCollection<FreightShipment>> {
  const params = buildFreightFilterParams(filters)
  const { data } = await api.get<HydraCollection<FreightShipment>>('/api/freight_shipments', { params })
  return data
}

function mapAndSortFreightShipments(data: HydraCollection<FreightShipment>): FreightShipment[] {
  return sortFreightShipmentsByNewestFirst(extractHydraMember(data))
}

export const freightService = {
  async getAll(filters: FreightFilters = {}) {
    const page = filters.page ?? 1
    const itemsPerPage = filters.itemsPerPage ?? 20

    const probeData = await fetchFreightCollection({
      ...filters,
      page: 1,
      itemsPerPage,
    })
    const totalItems = extractHydraTotalItems(probeData)

    let sortedItems: FreightShipment[]

    if (totalItems > itemsPerPage && totalItems <= CLIENT_SORT_MAX_ITEMS) {
      const fullData = await fetchFreightCollection({
        ...filters,
        page: 1,
        itemsPerPage: totalItems,
      })
      sortedItems = mapAndSortFreightShipments(fullData)
    } else {
      sortedItems = mapAndSortFreightShipments(probeData)
    }

    const start = (page - 1) * itemsPerPage
    return {
      items: sortedItems.slice(start, start + itemsPerPage),
      totalItems,
    }
  },

  async getById(id: string) {
    const { data } = await api.get<FreightShipment>(`/api/freight_shipments/${id}`)
    return data
  },

  async create(payload: FreightShipmentCreatePayload) {
    const { data } = await api.post<FreightShipment>('/api/freight_shipments', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: FreightShipmentPatchPayload) {
    const { data } = await api.patch<FreightShipment>(`/api/freight_shipments/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },

  async updateStatus(id: string, status: FreightStatus) {
    const body: FreightStatusPayload = { status }
    const { data } = await api.post<FreightShipment>(`/api/freight_shipments/${id}/status`, body, {
      headers: JSON_HEADERS,
    })
    return data
  },
}

export const freightPackageService = {
  async getById(id: string) {
    const { data } = await api.get<FreightPackage>(`/api/freight_packages/${id}`)
    return data
  },

  async update(id: string, payload: FreightPackagePatchPayload) {
    const { data } = await api.patch<FreightPackage>(`/api/freight_packages/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}
