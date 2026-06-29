import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  checkInService,
  type CheckInFilters,
} from '@/services/checkin.service'
import { checkInFiltersKey } from '@/lib/check-in-filters'
import type { CheckInCreatePayload, CheckInPatchPayload } from '@/types/check-in'
import { toast } from 'sonner'

export const checkInKeys = {
  all: ['checkIns'] as const,
  lists: () => [...checkInKeys.all, 'list'] as const,
  list: (filters: CheckInFilters) => [...checkInKeys.lists(), checkInFiltersKey(filters)] as const,
  details: () => [...checkInKeys.all, 'detail'] as const,
  detail: (id: string) => [...checkInKeys.details(), id] as const,
}

export function useCheckIns(filters: CheckInFilters = {}) {
  return useQuery({
    queryKey: checkInKeys.list(filters),
    queryFn: () => checkInService.getAll(filters),
  })
}

export function useCheckIn(id: string) {
  return useQuery({
    queryKey: checkInKeys.detail(id),
    queryFn: () => checkInService.getById(id),
    enabled: !!id,
  })
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CheckInCreatePayload) => checkInService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkInKeys.lists() })
      toast.success('Check-in enregistré avec succès')
    },
  })
}

export function useUpdateCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CheckInPatchPayload }) =>
      checkInService.update(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: checkInKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: checkInKeys.detail(id) })
      toast.success('Check-in mis à jour')
    },
  })
}
