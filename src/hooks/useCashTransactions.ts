import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cashTransactionService, type CashTransactionFilters } from '@/services/cash-transaction.service'
import type { CashTransactionCreatePayload } from '@/types/cash-transaction'
import { toast } from 'sonner'

export const cashTransactionKeys = {
  all: ['cashTransactions'] as const,
  lists: () => [...cashTransactionKeys.all, 'list'] as const,
  list: (filters: CashTransactionFilters) => [...cashTransactionKeys.lists(), filters] as const,
  detail: (id: string) => [...cashTransactionKeys.all, 'detail', id] as const,
}

export function useCashTransactions(
  filters: CashTransactionFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: cashTransactionKeys.list(filters),
    queryFn: () => cashTransactionService.getAll(filters),
    enabled: options?.enabled !== false,
  })
}

export function useCashTransaction(id: string) {
  return useQuery({
    queryKey: cashTransactionKeys.detail(id),
    queryFn: () => cashTransactionService.getById(id),
    enabled: !!id,
  })
}

export function useCreateCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CashTransactionCreatePayload) => cashTransactionService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cashTransactionKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ['cashRegisters'] })
      toast.success('Transaction créée')
    },
  })
}

export function useValidateCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cashTransactionService.validate(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: cashTransactionKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: cashTransactionKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: ['cashRegisters'] })
      toast.success('Transaction validée')
    },
  })
}
