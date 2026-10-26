import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  manualDebtService,
  type ManualDebtFilters,
} from '@/services/manual-debt.service'
import type {
  ManualDebtCreatePayload,
  ManualDebtPaymentPayload,
} from '@/types/manual-debt'

export const manualDebtKeys = {
  all: ['manual-debts'] as const,
  lists: () => [...manualDebtKeys.all, 'list'] as const,
  list: (filters: ManualDebtFilters) => [...manualDebtKeys.lists(), filters] as const,
  detail: (id: string) => [...manualDebtKeys.all, 'detail', id] as const,
}

export function useManualDebts(filters: ManualDebtFilters = {}) {
  return useQuery({
    queryKey: manualDebtKeys.list(filters),
    queryFn: () => manualDebtService.getAll(filters),
  })
}

export function useCreateManualDebt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ManualDebtCreatePayload) => manualDebtService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: manualDebtKeys.lists() })
      toast.success('Dette enregistrée')
    },
  })
}

export function usePayManualDebt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ManualDebtPaymentPayload }) =>
      manualDebtService.pay(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: manualDebtKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: manualDebtKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      toast.success('Encaissement enregistré')
    },
  })
}
