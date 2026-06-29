import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { currencyService, type CurrencyFilters } from '@/services/currency.service'
import type { CurrencyPayload } from '@/types/currency-resource'
import { toast } from 'sonner'

export const currencyKeys = {
  all: ['currencies'] as const,
  lists: () => [...currencyKeys.all, 'list'] as const,
  list: (filters: CurrencyFilters) => [...currencyKeys.lists(), filters] as const,
  detail: (id: string) => [...currencyKeys.all, 'detail', id] as const,
  select: () => [...currencyKeys.all, 'select'] as const,
}

export function useCurrencies(filters: CurrencyFilters = {}) {
  return useQuery({
    queryKey: currencyKeys.list(filters),
    queryFn: () => currencyService.getAll(filters),
  })
}

export function useCurrenciesForSelect(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: currencyKeys.select(),
    queryFn: () => currencyService.getAllForSelect(),
    enabled: options?.enabled !== false,
  })
}

export function useCurrency(id: string) {
  return useQuery({
    queryKey: currencyKeys.detail(id),
    queryFn: () => currencyService.getById(id),
    enabled: !!id,
  })
}

export function useCreateCurrency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CurrencyPayload) => currencyService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currencyKeys.lists() })
      toast.success('Devise créée')
    },
  })
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CurrencyPayload }) =>
      currencyService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: currencyKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: currencyKeys.detail(id) })
      toast.success('Devise mise à jour')
    },
  })
}
