import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useTicket, useUpdateTicket } from '@/hooks/useTickets'
import { TicketForm } from '@/components/forms/TicketForm'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Ticket as TicketIcon } from 'lucide-react'
import {
  getTicketIssuingOfficeLabel,
  ticketToFormDefaults,
  toTicketPatchPayload,
} from '@/lib/ticket'
import { TICKET_STATUS, TICKET_STATUS_LABELS } from '@/constants/ticket'
import type { TicketPatchFormData } from '@/schemas/ticket.schema'

export function TicketEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ticketId = id ?? ''
  const { data: ticket, isLoading } = useTicket(ticketId)
  const updateTicket = useUpdateTicket()

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner label="Chargement..." />
      </div>
    )
  }

  if (!ticket) {
    return (
      <EmptyState
        icon={TicketIcon}
        title="Billet introuvable"
        action={{ label: 'Retour à la billetterie', onClick: () => { window.location.href = '/tickets' } }}
      />
    )
  }

  const canEdit = ticket.status === TICKET_STATUS.ISSUED

  const handleSubmit = async (data: TicketPatchFormData) => {
    await updateTicket.mutateAsync({ id: ticketId, payload: toTicketPatchPayload(data) })
    void navigate(`/tickets/${ticketId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to={`/tickets/${ticket.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour au billet
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Pencil className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Modifier {ticket.ticketNumber}
          </h1>
        </div>
      </div>

      <TicketForm
        isEdit
        readOnly={!canEdit}
        ticketNumber={ticket.ticketNumber}
        issuingOfficeLabel={getTicketIssuingOfficeLabel(ticket)}
        statusLabel={TICKET_STATUS_LABELS[ticket.status]}
        defaultValues={ticketToFormDefaults(ticket)}
        onSubmit={handleSubmit}
        isLoading={updateTicket.isPending}
        submitLabel="Enregistrer les modifications"
        cancelHref={`/tickets/${ticket.id}`}
      />
    </div>
  )
}
