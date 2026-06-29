import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { provinceService, type ProvinceFilters } from '@/services/province.service'
import type { ProvincePayload } from '@/types/province'
import { toast } from 'sonner'

export const provinceKeys = {
  all: ['provinces'] as const,
  lists: () => [...provinceKeys.all, 'list'] as const,
  list: (filters: ProvinceFilters) => [...provinceKeys.lists(), filters] as const,
  select: () => [...provinceKeys.all, 'select'] as const,
  detail: (id: string) => [...provinceKeys.all, 'detail', id] as const,
}

export function useProvinces(filters: ProvinceFilters = {}) {
  return useQuery({
    queryKey: provinceKeys.list(filters),
    queryFn: () => provinceService.getAll(filters),
  })
}

export function useProvincesForSelect() {
  return useQuery({
    queryKey: provinceKeys.select(),
    queryFn: () => provinceService.getAllForSelect(),
  })
}

export function useProvince(id: string) {
  return useQuery({
    queryKey: provinceKeys.detail(id),
    queryFn: () => provinceService.getById(id),
    enabled: !!id,
  })
}

export function useCreateProvince() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProvincePayload) => provinceService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: provinceKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: provinceKeys.select() })
      toast.success('Province créée')
    },
  })
}

export function useUpdateProvince() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProvincePayload> }) =>
      provinceService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: provinceKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: provinceKeys.select() })
      void queryClient.invalidateQueries({ queryKey: provinceKeys.detail(id) })
      toast.success('Province mise à jour')
    },
  })
}
