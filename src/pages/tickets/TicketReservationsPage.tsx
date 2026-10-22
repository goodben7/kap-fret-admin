import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Banknote,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  Phone,
  Ticket as TicketIcon,
} from 'lucide-react'
import { useTickets, usePayTicket, useReportTicketTravelDate, useUpdateTicketStatus } from '@/hooks/useTickets'
import {
  TICKET_STATUS,
  TICKET_STATUS_LABELS,
  TICKET_SOURCE,
  TICKET_SOURCE_LABELS,
  CURRENCY,
  type TicketSource,
} from '@/constants/ticket'
import { TICKET_BUSINESS_RULES } from '@/constants/ticket-business-rules'
import {
  getReservationHoldInfo,
  getTicketPaidAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
  isOnlineTicketSource,
  toTicketPaymentPayload,
  toTicketReportTravelDatePayload,
} from '@/lib/ticket'
import { TicketPaymentModal } from '@/components/tickets/TicketPaymentModal'
import { TicketReportTravelDateModal } from '@/components/tickets/TicketReportTravelDateModal'
import { TicketContactActions } from '@/components/tickets/TicketContactActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  onIssue,
  onCancel,
  onReportTravelDate,
  actionPending,
}: {
  ticket: Ticket
  onPay: (ticket: Ticket) => void
  onIssue: (ticket: Ticket) => void
  onCancel: (ticket: Ticket) => void
  onReportTravelDate: (ticket: Ticket) => void
  actionPending: boolean
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
            {ticket.trackingCode && (
              <p className="mt-0.5 font-mono text-xs tracking-wider text-muted-foreground">
                Suivi {ticket.trackingCode}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="warning">{TICKET_STATUS_LABELS[TICKET_STATUS.RESERVED]}</Badge>
            {isOnlineTicketSource(ticket.source) && (
              <Badge variant="outline" className="gap-1 border-brand-orange/40 text-brand-orange">
                <Globe className="h-3 w-3" aria-hidden="true" />
                {TICKET_SOURCE_LABELS[TICKET_SOURCE.ONLINE]}
              </Badge>
            )}
          </div>
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

        {(() => {
          const hold = getReservationHoldInfo(ticket.createdAt)
          if (!hold) return null
          return (
            <p
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                hold.expired
                  ? 'bg-destructive/10 text-destructive'
                  : hold.remainingMs < 6 * 60 * 60 * 1000
                    ? 'bg-amber-500/10 text-amber-800'
                    : 'bg-muted/50 text-muted-foreground',
              )}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {hold.expired
                ? `Hold ${TICKET_BUSINESS_RULES.unpaidReservationHoldHours} h dépassé — expiration imminente`
                : `Expire dans ${hold.label} (hold ${TICKET_BUSINESS_RULES.unpaidReservationHoldHours} h)`}
            </p>
          )
        })()}

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
              disabled={actionPending}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Date
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-lg"
              onClick={() => onCancel(ticket)}
              disabled={actionPending}
            >
              <Ban className="h-3.5 w-3.5" />
              Annuler
            </Button>
            {remaining > 0 ? (
              <Button type="button" size="sm" className="rounded-lg" onClick={() => onPay(ticket)} disabled={actionPending}>
                <Banknote className="h-3.5 w-3.5" />
                Valider
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onIssue(ticket)}
                disabled={actionPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Émettre
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

type SourceFilter = '' | TicketSource

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: TICKET_SOURCE.ONLINE, label: TICKET_SOURCE_LABELS[TICKET_SOURCE.ONLINE] },
  { value: TICKET_SOURCE.COUNTER, label: TICKET_SOURCE_LABELS[TICKET_SOURCE.COUNTER] },
]

export function TicketReservationsPage() {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('')
  const { data, isLoading, isError, refetch } = useTickets({
    status: TICKET_STATUS.RESERVED,
    source: sourceFilter || undefined,
    itemsPerPage: 100,
    page: 1,
  })
  const payTicket = usePayTicket()
  const reportTravelDate = useReportTicketTravelDate()
  const updateStatus = useUpdateTicketStatus()
  const [paymentTicket, setPaymentTicket] = useState<Ticket | null>(null)
  const [reportDateTicket, setReportDateTicket] = useState<Ticket | null>(null)
  const [cancelTicket, setCancelTicket] = useState<Ticket | null>(null)
  const [issueTicket, setIssueTicket] = useState<Ticket | null>(null)

  const tickets = useMemo(() => data?.items ?? [], [data?.items])
  const fullyUnpaid = tickets.filter((t) => getTicketPaidAmount(t) <= 0)
  const partial = tickets.filter((t) => getTicketPaidAmount(t) > 0 && getTicketRemainingAmount(t) > 0)
  const onlineCount = tickets.filter((t) => isOnlineTicketSource(t.source)).length
  const actionPending = payTicket.isPending || reportTravelDate.isPending || updateStatus.isPending

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

  const handleConfirmCancel = async () => {
    if (!cancelTicket) return
    try {
      await updateStatus.mutateAsync({ id: cancelTicket.id, status: TICKET_STATUS.CANCELLED })
      setCancelTicket(null)
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Annulation impossible')
      }
    }
  }

  const handleConfirmIssue = async () => {
    if (!issueTicket) return
    try {
      await updateStatus.mutateAsync({ id: issueTicket.id, status: TICKET_STATUS.ISSUED })
      setIssueTicket(null)
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Émission impossible')
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
            Billets réservés — valider, encaisser le solde ou annuler · hold{' '}
            {TICKET_BUSINESS_RULES.unpaidReservationHoldHours} h
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link to="/tickets/new">Nouveau billet</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SOURCE_FILTERS.map(({ value, label }) => (
          <Button
            key={value || 'all'}
            type="button"
            size="sm"
            variant={sourceFilter === value ? 'default' : 'outline'}
            className={cn(
              'rounded-xl',
              sourceFilter === value && value === TICKET_SOURCE.ONLINE && 'bg-brand-orange hover:bg-brand-orange/90',
            )}
            onClick={() => setSourceFilter(value)}
          >
            {value === TICKET_SOURCE.ONLINE && <Globe className="h-3.5 w-3.5" aria-hidden="true" />}
            {label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Réservations</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">En ligne</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-orange">{onlineCount}</p>
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
          {tickets.map((ticket) => (
            <ReservationCard
              key={ticket.id}
              ticket={ticket}
              onPay={setPaymentTicket}
              onIssue={setIssueTicket}
              onCancel={setCancelTicket}
              onReportTravelDate={setReportDateTicket}
              actionPending={actionPending}
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

      <ConfirmDialog
        open={cancelTicket != null}
        onOpenChange={(open) => {
          if (!open && !updateStatus.isPending) setCancelTicket(null)
        }}
        variant="destructive"
        title="Annuler cette réservation ?"
        description="La réservation sera annulée. Cette action est irréversible."
        confirmLabel="Oui, annuler"
        cancelLabel="Non, revenir"
        onConfirm={handleConfirmCancel}
        loading={updateStatus.isPending}
      />

      <ConfirmDialog
        open={issueTicket != null}
        onOpenChange={(open) => {
          if (!open && !updateStatus.isPending) setIssueTicket(null)
        }}
        variant="success"
        title="Émettre ce billet ?"
        description="Le billet est soldé. Il passera au statut Émis."
        confirmLabel="Oui, émettre"
        cancelLabel="Non, revenir"
        onConfirm={handleConfirmIssue}
        loading={updateStatus.isPending}
      />
    </div>
  )
}
