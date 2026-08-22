import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cashRegisterService, type CashRegisterFilters } from '@/services/cash-register.service'
import type { CashRegisterCreatePayload, CashRegisterPatchPayload } from '@/types/cash-register'
import { filterCashRegistersForUserRoles } from '@/lib/cash-register'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export const cashRegisterKeys = {
  all: ['cashRegisters'] as const,
  lists: () => [...cashRegisterKeys.all, 'list'] as const,
  list: (filters: CashRegisterFilters) => [...cashRegisterKeys.lists(), filters] as const,
  detail: (id: string) => [...cashRegisterKeys.all, 'detail', id] as const,
}

export function useCashRegisters(filters: CashRegisterFilters = {}) {
  return useQuery({
    queryKey: cashRegisterKeys.list(filters),
    queryFn: () => cashRegisterService.getAll(filters),
  })
}

export function useCashRegistersForSelect(issuingOfficeIri?: string) {
  const { user } = useAuth()
  const roles = user?.roles ?? []

  return useQuery({
    queryKey: [...cashRegisterKeys.lists(), 'select', issuingOfficeIri ?? '', roles.join(',')],
    queryFn: async () => {
      const { items } = await cashRegisterService.getByIssuingOffice(issuingOfficeIri!)
      return filterCashRegistersForUserRoles(items, roles)
    },
    enabled: !!issuingOfficeIri,
  })
}

export function useCashRegister(id: string) {
  return useQuery({
    queryKey: cashRegisterKeys.detail(id),
    queryFn: () => cashRegisterService.getById(id),
    enabled: !!id,
  })
}

export function useCreateCashRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CashRegisterCreatePayload) => cashRegisterService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cashRegisterKeys.lists() })
      toast.success('Caisse créée')
    },
  })
}

export function useUpdateCashRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CashRegisterPatchPayload }) =>
      cashRegisterService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: cashRegisterKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: cashRegisterKeys.detail(id) })
      toast.success('Caisse mise à jour')
    },
  })
}
