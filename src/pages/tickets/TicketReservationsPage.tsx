import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CalendarClock,
  ChevronRight,
  Phone,
  Ticket as TicketIcon,
} from 'lucide-react'
import { useTickets, usePayTicket, useReportTicketTravelDate } from '@/hooks/useTickets'
import { TICKET_STATUS, TICKET_STATUS_LABELS, CURRENCY } from '@/constants/ticket'
import {
  getTicketPaidAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
  toTicketPaymentPayload,
  toTicketReportTravelDatePayload,
} from '@/lib/ticket'
import { TicketPaymentModal } from '@/components/tickets/TicketPaymentModal'
import { TicketReportTravelDateModal } from '@/components/tickets/TicketReportTravelDateModal'
import { TicketContactActions } from '@/components/tickets/TicketContactActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, formatMoney, cn } from '@/lib/utils'
import type { Ticket } from '@/types/ticket'
import type { TicketPaymentFormData } from '@/schemas/ticket-payment.schema'
import type { TicketReportTravelDateFormData } from '@/schemas/ticket-report-travel-date.schema'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { extractApiErrorMessage } from '@/services/api'

function ReservationCard({
  ticket,
  onPay,
  onReportTravelDate,
}: {
  ticket: Ticket
  onPay: (ticket: Ticket) => void
  onReportTravelDate: (ticket: Ticket) => void
}) {
  const total = getTicketTotalAmount(ticket)
  const paid = getTicketPaidAmount(ticket)
  const remaining = getTicketRemainingAmount(ticket)

  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/tickets/${ticket.id}`}
              className="font-mono text-sm font-semibold text-primary hover:underline"
            >
              {ticket.ticketNumber}
            </Link>
            <p className="mt-1 truncate font-medium">{ticket.passengerName}</p>
            {ticket.phone && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" aria-hidden="true" />
                {ticket.phone}
              </p>
            )}
          </div>
          <Badge variant="warning">{TICKET_STATUS_LABELS[TICKET_STATUS.RESERVED]}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(total, CURRENCY.USD)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payé</p>
            <p className="mt-0.5 font-semibold tabular-nums text-emerald-700">
              {formatMoney(paid, CURRENCY.USD)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Reste</p>
            <p className={cn('mt-0.5 font-semibold tabular-nums', remaining > 0 ? 'text-brand-orange' : 'text-muted-foreground')}>
              {formatMoney(remaining, CURRENCY.USD)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(ticket.travelDate)} · {ticket.travelTime?.slice(0, 5) ?? '—'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <TicketContactActions phone={ticket.phone} passengerName={ticket.passengerName} size="sm" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => onReportTravelDate(ticket)}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Date
            </Button>
            {remaining > 0 && (
              <Button type="button" size="sm" className="rounded-lg" onClick={() => onPay(ticket)}>
                <Banknote className="h-3.5 w-3.5" />
                Acompte
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <Link to={`/tickets/${ticket.id}`} aria-label="Voir le billet">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TicketReservationsPage() {
  const { data, isLoading, isError, refetch } = useTickets({
    status: TICKET_STATUS.RESERVED,
    itemsPerPage: 100,
    page: 1,
  })
  const payTicket = usePayTicket()
  const reportTravelDate = useReportTicketTravelDate()
  const [paymentTicket, setPaymentTicket] = useState<Ticket | null>(null)
  const [reportDateTicket, setReportDateTicket] = useState<Ticket | null>(null)

  const tickets = useMemo(() => data?.items ?? [], [data?.items])
  const withBalance = tickets.filter((t) => getTicketRemainingAmount(t) > 0)
  const fullyUnpaid = tickets.filter((t) => getTicketPaidAmount(t) <= 0)
  const partial = tickets.filter((t) => getTicketPaidAmount(t) > 0 && getTicketRemainingAmount(t) > 0)

  const handlePay = async (formData: TicketPaymentFormData) => {
    if (!paymentTicket) return
    try {
      await payTicket.mutateAsync({
        id: paymentTicket.id,
        payload: toTicketPaymentPayload(paymentTicket, formData),
      })
      setPaymentTicket(null)
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Paiement impossible')
      }
    }
  }

  const handleReportTravelDate = async (formData: TicketReportTravelDateFormData) => {
    if (!reportDateTicket) return
    try {
      await reportTravelDate.mutateAsync({
        id: reportDateTicket.id,
        payload: toTicketReportTravelDatePayload(formData),
      })
      setReportDateTicket(null)
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de reporter la date')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link to="/tickets" aria-label="Retour billetterie">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Réservations</h1>
          <p className="text-sm text-muted-foreground">
            Billets réservés — acomptes et soldes à encaisser
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link to="/tickets/new">Nouveau billet</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Réservations</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sans acompte</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{fullyUnpaid.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Acomptes en cours</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-orange">{partial.length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement des réservations..." />
      ) : isError ? (
        <EmptyState
          title="Impossible de charger les réservations"
          action={
            <Button type="button" onClick={() => void refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="Aucune réservation"
          description="Les billets créés sans encaissement immédiat apparaissent ici."
          action={
            <Button asChild>
              <Link to="/tickets/new">Créer un billet</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {withBalance.map((ticket) => (
            <ReservationCard
              key={ticket.id}
              ticket={ticket}
              onPay={setPaymentTicket}
              onReportTravelDate={setReportDateTicket}
            />
          ))}
        </div>
      )}

      {paymentTicket && (
        <TicketPaymentModal
          open={!!paymentTicket}
          onOpenChange={(open) => {
            if (!open && !payTicket.isPending) setPaymentTicket(null)
          }}
          ticket={paymentTicket}
          onConfirm={handlePay}
          isLoading={payTicket.isPending}
        />
      )}

      {reportDateTicket && (
        <TicketReportTravelDateModal
          open={!!reportDateTicket}
          onOpenChange={(open) => {
            if (!open && !reportTravelDate.isPending) setReportDateTicket(null)
          }}
          ticket={reportDateTicket}
          onSubmit={handleReportTravelDate}
          isLoading={reportTravelDate.isPending}
        />
      )}
    </div>
  )
}
