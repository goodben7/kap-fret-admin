import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  issuingOfficeService,
  type IssuingOfficeFilters,
} from '@/services/issuing-office.service'
import { userService } from '@/services/user.service'
import type { IssuingOfficeCreatePayload, IssuingOfficePatchPayload } from '@/types/issuing-office'
import type { AdminAccessPayload } from '@/types/user'
import { toast } from 'sonner'

export const issuingOfficeKeys = {
  all: ['issuingOffices'] as const,
  lists: () => [...issuingOfficeKeys.all, 'list'] as const,
  list: (filters: IssuingOfficeFilters) => [...issuingOfficeKeys.lists(), filters] as const,
  detail: (id: string) => [...issuingOfficeKeys.all, 'detail', id] as const,
  admin: (officeId: string) => [...issuingOfficeKeys.all, 'admin', officeId] as const,
}

export function useIssuingOffices(filters: IssuingOfficeFilters = {}) {
  return useQuery({
    queryKey: issuingOfficeKeys.list(filters),
    queryFn: () => issuingOfficeService.getAll(filters),
  })
}

export function useIssuingOffice(id: string) {
  return useQuery({
    queryKey: issuingOfficeKeys.detail(id),
    queryFn: () => issuingOfficeService.getById(id),
    enabled: !!id,
  })
}

export function useIssuingOfficeAdmin(officeId: string, enabled = true) {
  return useQuery({
    queryKey: issuingOfficeKeys.admin(officeId),
    queryFn: () => userService.findOfficeAdmin(officeId),
    enabled: !!officeId && enabled,
  })
}

export function useCreateIssuingOffice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: IssuingOfficeCreatePayload) => issuingOfficeService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: issuingOfficeKeys.lists() })
      toast.success('Bureau d\'émission créé')
    },
  })
}

export function useUpdateIssuingOffice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IssuingOfficePatchPayload }) =>
      issuingOfficeService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: issuingOfficeKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: issuingOfficeKeys.detail(id) })
      toast.success('Bureau d\'émission mis à jour')
    },
  })
}

export function useCreateOfficeAdminAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ payload }: { officeId: string; payload: AdminAccessPayload }) =>
      userService.createOfficeAdmin(payload),
    onSuccess: (_, { officeId }) => {
      void queryClient.invalidateQueries({ queryKey: issuingOfficeKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: issuingOfficeKeys.detail(officeId) })
      void queryClient.invalidateQueries({ queryKey: issuingOfficeKeys.admin(officeId) })
      toast.success('Administrateur du bureau créé')
    },
  })
}
