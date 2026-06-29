import { useQuery } from '@tanstack/react-query'
import { activityService, type ActivityFilters } from '@/services/activity.service'

export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (filters: ActivityFilters) => [...activityKeys.lists(), filters] as const,
}

export function useActivities(filters: ActivityFilters = {}, enabled = true) {
  return useQuery({
    queryKey: activityKeys.list(filters),
    queryFn: () => activityService.getAll(filters),
    enabled,
  })
}

export function useTicketActivities(ticketId: string) {
  return useActivities(
    {
      ressourceName: 'ticket',
      ressourceIdentifier: ticketId,
      itemsPerPage: 100,
    },
    Boolean(ticketId),
  )
}

export function useFreightActivities(shipmentId: string) {
  return useActivities(
    {
      ressourceName: 'freight_shipment',
      ressourceIdentifier: shipmentId,
      itemsPerPage: 100,
    },
    Boolean(shipmentId),
  )
}
