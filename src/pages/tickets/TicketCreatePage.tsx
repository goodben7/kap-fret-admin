import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Ticket } from 'lucide-react'
import { useCreateTicket } from '@/hooks/useTickets'
import { TicketForm } from '@/components/forms/TicketForm'
import { useAuth } from '@/hooks/useAuth'
import { toTicketCreatePayload } from '@/lib/ticket'
import type { TicketFormData } from '@/schemas/ticket.schema'

export function TicketCreatePage() {
  const navigate = useNavigate()
  const createTicket = useCreateTicket()
  const { issuingOfficeName } = useAuth()

  const handleSubmit = async (data: TicketFormData) => {
    const ticket = await createTicket.mutateAsync(toTicketCreatePayload(data))
    void navigate(`/tickets/${ticket.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Billetterie
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Ticket className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau billet</h1>
        </div>
        <p className="text-sm text-muted-foreground pl-11">
          {issuingOfficeName
            ? `Émission depuis ${issuingOfficeName}`
            : 'Renseignez les informations du passager et du voyage'}
        </p>
      </div>

      <TicketForm
        onSubmit={handleSubmit}
        isLoading={createTicket.isPending}
        submitLabel="Créer le billet"
        cancelHref="/tickets"
      />
    </div>
  )
}
