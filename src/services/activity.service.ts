import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { buildActivityFilterParams, type ActivityListFilters } from '@/lib/activity-filters'
import type { HydraCollection } from '@/types/hydra'
import type { Activity } from '@/types/activity'

export type { ActivityListFilters as ActivityFilters } from '@/lib/activity-filters'

export const activityService = {
  async getAll(filters: ActivityListFilters = {}) {
    const { data } = await api.get<HydraCollection<Activity>>('/api/activities', {
      params: buildActivityFilterParams(filters),
    })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },
}
