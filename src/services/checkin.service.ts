import { api } from './api'
import { buildCheckInFilterParams, type CheckInFilters } from '@/lib/check-in-filters'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { normalizeCheckInResource, sortCheckInsByNewestFirst, sortCheckInsByRegistrationOrder } from '@/lib/check-in'
import type { HydraCollection } from '@/types/hydra'
import type { CheckIn, CheckInCreatePayload, CheckInPatchPayload } from '@/types/check-in'

export type { CheckInFilters } from '@/lib/check-in-filters'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

/** Au-delà de cette limite, on s'appuie sur le tri API + pagination serveur */
const CLIENT_SORT_MAX_ITEMS = 500

async function fetchCheckInCollection(
  filters: CheckInFilters,
): Promise<HydraCollection<CheckIn>> {
  const params = buildCheckInFilterParams(filters)
  const { data } = await api.get<HydraCollection<CheckIn>>('/api/check_ins', { params })
  return data
}

function mapAndSortCheckIns(
  data: HydraCollection<CheckIn>,
  sortMode: 'newest' | 'registration',
): CheckIn[] {
  const items = extractHydraMember(data).map(normalizeCheckInResource)
  return sortMode === 'registration'
    ? sortCheckInsByRegistrationOrder(items)
    : sortCheckInsByNewestFirst(items)
}

export const checkInService = {
  async getAll(filters: CheckInFilters = {}) {
    const page = filters.page ?? 1
    const itemsPerPage = filters.itemsPerPage ?? 15
    // Date de vol active → ordre d'enregistrement (1er check-in = N° 1)
    const sortMode = filters.travelDate?.trim() ? 'registration' : 'newest'

    const probeData = await fetchCheckInCollection({
      ...filters,
      page: 1,
      itemsPerPage,
    })
    const totalItems = extractHydraTotalItems(probeData)

    let sortedItems: CheckIn[]

    if (totalItems > itemsPerPage && totalItems <= CLIENT_SORT_MAX_ITEMS) {
      const fullData = await fetchCheckInCollection({
        ...filters,
        page: 1,
        itemsPerPage: totalItems,
      })
      sortedItems = mapAndSortCheckIns(fullData, sortMode)
    } else {
      sortedItems = mapAndSortCheckIns(probeData, sortMode)
    }

    const start = (page - 1) * itemsPerPage
    return {
      items: sortedItems.slice(start, start + itemsPerPage),
      totalItems,
    }
  },

  async getById(id: string) {
    const { data } = await api.get<CheckIn>(`/api/check_ins/${id}`)
    return normalizeCheckInResource(data)
  },

  async create(payload: CheckInCreatePayload) {
    const { data } = await api.post<CheckIn>('/api/check_ins', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: CheckInPatchPayload) {
    const { data } = await api.patch<CheckIn>(`/api/check_ins/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}
