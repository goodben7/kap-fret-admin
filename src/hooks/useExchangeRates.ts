import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { exchangeRateService, type ExchangeRateFilters } from '@/services/exchange-rate.service'
import type { ExchangeRateCreatePayload, ExchangeRatePatchPayload } from '@/types/exchange-rate'
import { toast } from 'sonner'

export const exchangeRateKeys = {
  all: ['exchangeRates'] as const,
  lists: () => [...exchangeRateKeys.all, 'list'] as const,
  list: (filters: ExchangeRateFilters) => [...exchangeRateKeys.lists(), filters] as const,
  detail: (id: string) => [...exchangeRateKeys.all, 'detail', id] as const,
}

export function useExchangeRates(filters: ExchangeRateFilters = {}) {
  return useQuery({
    queryKey: exchangeRateKeys.list(filters),
    queryFn: () => exchangeRateService.getAll(filters),
  })
}

export function useExchangeRate(id: string) {
  return useQuery({
    queryKey: exchangeRateKeys.detail(id),
    queryFn: () => exchangeRateService.getById(id),
    enabled: !!id,
  })
}

export function useCreateExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ExchangeRateCreatePayload) => exchangeRateService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exchangeRateKeys.lists() })
      toast.success('Taux de change créé')
    },
  })
}

export function useUpdateExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExchangeRatePatchPayload }) =>
      exchangeRateService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: exchangeRateKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: exchangeRateKeys.detail(id) })
      toast.success('Taux de change mis à jour')
    },
  })
}

export function useDeleteExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => exchangeRateService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exchangeRateKeys.lists() })
      toast.success('Taux de change supprimé')
    },
  })
}
