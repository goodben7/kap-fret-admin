import { useQuery } from '@tanstack/react-query'
import { getPreviousPeriodRange, serializeStatsFilters } from '@/lib/stats'
import { statsService } from '@/services/stats.service'
import type { StatsComparison, StatsFilters } from '@/types/stats'

export const statsKeys = {
  all: ['stats'] as const,
  dashboard: (filters: StatsFilters) => [...statsKeys.all, 'dashboard', ...serializeStatsFilters(filters)] as const,
}

export function useAppStats(filters: StatsFilters, options?: { comparePrevious?: boolean }) {
  const comparePrevious = options?.comparePrevious !== false

  return useQuery({
    queryKey: statsKeys.dashboard(filters),
    queryFn: async (): Promise<StatsComparison> => {
      const current = await statsService.getStats(filters)

      if (!comparePrevious) {
        return { current, previous: null }
      }

      const previousRange = getPreviousPeriodRange(filters.startDate, filters.endDate)
      let previous = null
      try {
        previous = await statsService.getStats({
          ...filters,
          startDate: previousRange.startDate,
          endDate: previousRange.endDate,
        })
      } catch {
        previous = null
      }

      return { current, previous }
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
  })
}
