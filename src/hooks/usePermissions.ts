import { useQuery } from '@tanstack/react-query'
import { permissionService } from '@/services/permission.service'

export const permissionKeys = {
  all: ['permissions'] as const,
  list: () => [...permissionKeys.all, 'list'] as const,
}

export function usePermissions() {
  return useQuery({
    queryKey: permissionKeys.list(),
    queryFn: () => permissionService.getAll(),
    staleTime: 1000 * 60 * 30,
  })
}
