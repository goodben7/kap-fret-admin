import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketService } from '@/services/ticket.service'
import { buildTicketFilterParams, type TicketFilters } from '@/lib/ticket-filters'
import type { TicketCreatePayload, TicketPatchPayload, TicketReportTravelDatePayload, TicketPaymentPayload } from '@/types/ticket'
import type { TicketStatus } from '@/constants/ticket'
import { toast } from 'sonner'

export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: TicketFilters) => [...ticketKeys.lists(), buildTicketFilterParams(filters)] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
}

export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () => ticketService.getAll(filters),
    staleTime: 0,
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketService.getById(id),
    enabled: !!id,
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TicketCreatePayload) => ticketService.create(payload),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      toast.success(
        ticket.status === 'RESERVED' ? 'Billet réservé avec succès' : 'Billet créé avec succès',
      )
    },
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TicketPatchPayload }) =>
      ticketService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) })
      toast.success('Billet mis à jour')
    },
  })
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      ticketService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: ['activities'] })
      toast.success('Statut du billet mis à jour')
    },
  })
}

export function useReportTicketTravelDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TicketReportTravelDatePayload }) =>
      ticketService.reportTravelDate(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: ['activities'] })
      toast.success('Date de voyage reportée')
    },
  })
}

export function usePayTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TicketPaymentPayload }) =>
      ticketService.pay(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['activities'] })
      toast.success('Paiement enregistré — billet émis')
    },
  })
}
