import { api } from './api'
import { enrichStatsWithEntityFilters } from '@/lib/stats-enrichment'
import { parseStatsResponse } from '@/lib/stats'
import type { AppStats, StatsApiResponse, StatsFilters } from '@/types/stats'

function buildStatsParams(filters: StatsFilters): Record<string, string> {
  const params: Record<string, string> = {
    startDate: filters.startDate,
    endDate: filters.endDate,
  }

  if (filters.currency) params.currency = filters.currency
  if (filters.issuingOfficeId?.trim()) params.issuingOfficeId = filters.issuingOfficeId.trim()
  if (filters.type) params.type = filters.type

  return params
}

export const statsService = {
  async getStats(filters: StatsFilters): Promise<AppStats> {
    const { data } = await api.get<StatsApiResponse>('/api/stats', {
      params: buildStatsParams(filters),
    })
    const base = parseStatsResponse(data)
    return enrichStatsWithEntityFilters(base, filters)
  },
}
