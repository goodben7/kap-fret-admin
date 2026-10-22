import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { extractApiErrorMessage } from '@/services/api'
import {
  publicReservationService,
  type PublicReservationCreatePayload,
  type PublicReservationLookupPayload,
} from '@/services/public-reservation.service'

export const publicReservationKeys = {
  checkpoints: ['public', 'checkpoints'] as const,
  prices: ['public', 'category-prices'] as const,
}

export function usePublicCheckpoints() {
  return useQuery({
    queryKey: publicReservationKeys.checkpoints,
    queryFn: () => publicReservationService.listCheckpoints(),
    staleTime: 5 * 60_000,
  })
}

export function usePublicCategoryPrices() {
  return useQuery({
    queryKey: publicReservationKeys.prices,
    queryFn: () => publicReservationService.listCategoryPrices(),
    staleTime: 5 * 60_000,
  })
}

export function useCreatePublicReservation() {
  return useMutation({
    mutationFn: (payload: PublicReservationCreatePayload) =>
      publicReservationService.create(payload),
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible d’enregistrer la réservation')
      }
    },
  })
}

export function useLookupPublicReservation() {
  return useMutation({
    mutationFn: (payload: PublicReservationLookupPayload) =>
      publicReservationService.lookup(payload),
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de retrouver la réservation')
      }
    },
  })
}
