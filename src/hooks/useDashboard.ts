import { useQuery } from '@tanstack/react-query'
import { dashboardService, type RecentActivityFilters } from '@/services/dashboard.service'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  recentTickets: (filters?: RecentActivityFilters, limit?: number) =>
    [...dashboardKeys.all, 'recentTickets', filters?.startDate ?? '', filters?.endDate ?? '', limit ?? 5] as const,
  recentShipments: (filters?: RecentActivityFilters, limit?: number) =>
    [...dashboardKeys.all, 'recentShipments', filters?.startDate ?? '', filters?.endDate ?? '', limit ?? 5] as const,
}

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardService.getStats(),
  })
}

export function useRecentTickets(filters?: RecentActivityFilters, limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.recentTickets(filters, limit),
    queryFn: () => dashboardService.getRecentTickets(limit, filters),
  })
}

export function useRecentShipments(filters?: RecentActivityFilters, limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.recentShipments(filters, limit),
    queryFn: () => dashboardService.getRecentShipments(limit, filters),
  })
}
