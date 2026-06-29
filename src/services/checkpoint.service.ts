import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { buildCheckpointFilterParams, type CheckpointFilters } from '@/lib/checkpoint-filters'
import { parseCheckpointMember, getCheckpointSearchText } from '@/lib/checkpoint'
import type { HydraCollection } from '@/types/hydra'
import type { Checkpoint, CheckpointPayload } from '@/types/checkpoint'

export type { CheckpointFilters } from '@/lib/checkpoint-filters'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

const CHECKPOINT_PAGE_SIZE = 100

function parseCheckpointItems(data: HydraCollection<Checkpoint> | Checkpoint[]): Checkpoint[] {
  return extractHydraMember(data)
    .map(parseCheckpointMember)
    .filter((cp): cp is Checkpoint => cp != null)
}

/** Parcourt toutes les pages */
async function fetchAllCheckpoints(
  filters: Omit<CheckpointFilters, 'page' | 'itemsPerPage' | 'pagination'> = {},
): Promise<Checkpoint[]> {
  const items: Checkpoint[] = []
  let page = 1

  while (true) {
    const result = await checkpointService.getAll({
      ...filters,
      page,
      itemsPerPage: CHECKPOINT_PAGE_SIZE,
    })

    if (result.items.length === 0) break

    items.push(...result.items)

    const total = result.totalItems
    if (total > 0 && items.length >= total) break
    if (result.items.length < CHECKPOINT_PAGE_SIZE) break

    page += 1
  }

  return items
}

export const checkpointService = {
  async getAll(filters: CheckpointFilters = {}) {
    const { data } = await api.get<HydraCollection<Checkpoint>>('/api/checkpoints', {
      params: buildCheckpointFilterParams(filters),
    })
    const items = parseCheckpointItems(data)
    return {
      items,
      totalItems: extractHydraTotalItems(data) || items.length,
    }
  },

  /** Toute la collection (pagination API désactivée ou parcours des pages) */
  async getAllUnpaginated(filters: Omit<CheckpointFilters, 'page' | 'itemsPerPage' | 'pagination'> = {}) {
    const items = await fetchAllCheckpoints(filters)
    return { items, totalItems: items.length }
  },

  /** Liste pour select : tous les checkpoints, filtre ipartial sur label si recherche */
  async searchForSelect(search: string) {
    const query = search.trim()
    const items = await fetchAllCheckpoints(query ? { label: query } : {})

    if (!query) {
      return { items, totalItems: items.length }
    }

    const q = query.toLowerCase()
    const filtered = items.filter((cp) => getCheckpointSearchText(cp).includes(q))
    return { items: filtered, totalItems: filtered.length }
  },

  async getById(id: string | number) {
    const { data } = await api.get<Checkpoint>(`/api/checkpoints/${id}`)
    return data
  },

  async create(payload: CheckpointPayload) {
    const { data } = await api.post<Checkpoint>('/api/checkpoints', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: Partial<CheckpointPayload>) {
    const { data } = await api.patch<Checkpoint>(`/api/checkpoints/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}
