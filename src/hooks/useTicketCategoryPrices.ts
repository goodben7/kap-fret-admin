import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketCategoryPriceService } from '@/services/ticket-category-price.service'
import type {
  TicketCategoryPriceCreatePayload,
  TicketCategoryPricePatchPayload,
} from '@/types/ticket-category-price'

export const ticketCategoryPriceKeys = {
  all: ['ticket-category-prices'] as const,
  list: () => [...ticketCategoryPriceKeys.all, 'list'] as const,
  detail: (id: string) => [...ticketCategoryPriceKeys.all, 'detail', id] as const,
}

export function useTicketCategoryPrices(options?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: [...ticketCategoryPriceKeys.list(), options?.activeOnly ?? false],
    queryFn: () =>
      ticketCategoryPriceService.getAll({
        active: options?.activeOnly ? true : undefined,
        pagination: false,
      }),
    staleTime: 60_000,
  })
}

export function useUpdateTicketCategoryPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TicketCategoryPricePatchPayload }) =>
      ticketCategoryPriceService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketCategoryPriceKeys.all })
    },
  })
}

export function useCreateTicketCategoryPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TicketCategoryPriceCreatePayload) => ticketCategoryPriceService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketCategoryPriceKeys.all })
    },
  })
}
