import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { freightService, freightPackageService, type FreightFilters } from '@/services/freight.service'
import type {
  FreightShipmentCreatePayload,
  FreightShipmentPatchPayload,
  FreightPackagePatchPayload,
} from '@/types/freight-shipment'
import type { FreightStatus } from '@/constants/freight'
import { toast } from 'sonner'

export const freightKeys = {
  all: ['freight'] as const,
  lists: () => [...freightKeys.all, 'list'] as const,
  list: (filters: FreightFilters) => [...freightKeys.lists(), filters] as const,
  details: () => [...freightKeys.all, 'detail'] as const,
  detail: (id: string) => [...freightKeys.details(), id] as const,
}

export const freightPackageKeys = {
  all: ['freightPackages'] as const,
  detail: (id: string) => [...freightPackageKeys.all, id] as const,
}

export function useFreight(filters: FreightFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: freightKeys.list(filters),
    queryFn: () => freightService.getAll(filters),
    enabled: options?.enabled !== false,
  })
}

export function useFreightShipment(id: string) {
  return useQuery({
    queryKey: freightKeys.detail(id),
    queryFn: () => freightService.getById(id),
    enabled: !!id,
  })
}

export function useCreateFreightShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FreightShipmentCreatePayload) => freightService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: freightKeys.lists() })
      toast.success('Expédition créée avec succès')
    },
  })
}

export function useUpdateFreightShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FreightShipmentPatchPayload }) =>
      freightService.update(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: freightKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: freightKeys.detail(id) })
      toast.success('Expédition mise à jour')
    },
  })
}

export function useUpdateFreightStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FreightStatus }) =>
      freightService.updateStatus(id, status),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: freightKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: freightKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: ['activities'] })
      toast.success('Statut mis à jour')
    },
  })
}

export function useMarkFreightShipmentsSent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => freightService.markManyAsSent(ids),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: freightKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: freightKeys.details() })
      void queryClient.invalidateQueries({ queryKey: ['activities'] })
      const ok = result.succeeded.length
      const ko = result.failed.length
      if (ok > 0 && ko === 0) {
        toast.success(
          ok === 1
            ? '1 LTA marquée comme expédiée'
            : `${ok} LTA marquées comme expédiées`,
        )
      } else if (ok > 0 && ko > 0) {
        toast.warning(`${ok} expédiée(s), ${ko} échec(s)`)
      } else if (ko > 0) {
        toast.error(result.failed[0]?.message ?? 'Aucune LTA n’a pu être expédiée')
      }
    },
  })
}

export function useUpdateFreightPackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload, shipmentId }: { id: string; payload: FreightPackagePatchPayload; shipmentId: string }) =>
      freightPackageService.update(id, payload).then((data) => ({ data, shipmentId })),
    onSuccess: ({ shipmentId }) => {
      void queryClient.invalidateQueries({ queryKey: freightKeys.detail(shipmentId) })
      toast.success('Colis mis à jour')
    },
  })
}
