import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  Scale,
  Ticket,
  Wallet,
} from 'lucide-react'
import { useTickets } from '@/hooks/useTickets'
import { useFreight } from '@/hooks/useFreight'
import { useCheckIns } from '@/hooks/useCheckIns'
import { PAYMENT_MODE, TICKET_STATUS, CURRENCY, PAYMENT_MODE_LABELS } from '@/constants/ticket'
import { FREIGHT_PAYMENT_MODE, FREIGHT_PAYMENT_MODE_LABELS } from '@/constants/freight'
import {
  getTicketPaidAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
} from '@/lib/ticket'
import {
  getCheckInPassengerName,
  getCheckInTicketNumber,
  hasCheckInObservations,
} from '@/lib/check-in'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import type { Ticket as TicketType } from '@/types/ticket'
import type { FreightShipment } from '@/types/freight-shipment'
import type { CheckIn } from '@/types/check-in'

function isTicketDebt(ticket: TicketType): boolean {
  if (ticket.status === TICKET_STATUS.CANCELLED || ticket.status === TICKET_STATUS.REFUNDED) {
    return false
  }
  if (ticket.paymentMode === PAYMENT_MODE.ACC || ticket.paymentMode === PAYMENT_MODE.PTA) {
    return getTicketRemainingAmount(ticket) > 0.001
  }
  return getTicketRemainingAmount(ticket) > 0.001
}

function isFreightDebt(shipment: FreightShipment): boolean {
  const remaining = parseFloat(shipment.remainingAmount) || 0
  if (remaining <= 0.001) return false
  return (
    shipment.paymentMode === FREIGHT_PAYMENT_MODE.ACC
    || shipment.paymentMode === FREIGHT_PAYMENT_MODE.PTA
    || remaining > 0
  )
}

function isCheckInDebt(checkIn: CheckIn): boolean {
  return hasCheckInObservations(checkIn.destinationObservations)
}

export function DebtsReportPage() {
  const ticketsQuery = useTickets({ itemsPerPage: 200, page: 1 })
  const freightQuery = useFreight({ itemsPerPage: 200, page: 1 })
  const checkInsQuery = useCheckIns({ itemsPerPage: 200, page: 1 })

  const ticketDebts = useMemo(
    () => (ticketsQuery.data?.items ?? []).filter(isTicketDebt),
    [ticketsQuery.data?.items],
  )
  const freightDebts = useMemo(
    () => (freightQuery.data?.items ?? []).filter(isFreightDebt),
    [freightQuery.data?.items],
  )
  const checkInDebts = useMemo(
    () => (checkInsQuery.data?.items ?? []).filter(isCheckInDebt),
    [checkInsQuery.data?.items],
  )

  const ticketTotal = ticketDebts.reduce((sum, t) => sum + getTicketRemainingAmount(t), 0)
  const freightTotal = freightDebts.reduce(
    (sum, s) => sum + (parseFloat(s.remainingAmount) || 0),
    0,
  )

  const loading = ticketsQuery.isLoading || freightQuery.isLoading || checkInsQuery.isLoading
  const empty = !loading && ticketDebts.length === 0 && freightDebts.length === 0 && checkInDebts.length === 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 lg:max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link to="/admin/cash-registers" aria-label="Retour finance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Dettes</h1>
          <p className="text-sm text-muted-foreground">
            Soldes ouverts — billets (ACC/PTA/acomptes), fret et paiements à destination
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Billets</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-orange">
              {formatMoney(ticketTotal, CURRENCY.USD)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{ticketDebts.length} dossier(s)</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fret</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-orange">
              {formatMoney(freightTotal, CURRENCY.USD)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{freightDebts.length} LTA</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-in destination</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{checkInDebts.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">obs. à destination</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <LoadingSpinner label="Chargement des dettes..." />
      ) : empty ? (
        <EmptyState
          icon={Wallet}
          title="Aucune dette ouverte"
          description="Les acomptes, ACC/PTA et soldes fret apparaîtront ici."
        />
      ) : (
        <div className="space-y-8">
          {ticketDebts.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Ticket className="h-4 w-4" />
                Billets
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {ticketDebts.map((ticket) => {
                  const remaining = getTicketRemainingAmount(ticket)
                  const paid = getTicketPaidAmount(ticket)
                  const total = getTicketTotalAmount(ticket)
                  return (
                    <Card key={ticket.id} className="rounded-2xl border-border/80 shadow-sm">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/tickets/${ticket.id}`}
                              className="font-mono text-sm font-semibold text-primary hover:underline"
                            >
                              {ticket.ticketNumber}
                            </Link>
                            <p className="truncate font-medium">{ticket.passengerName}</p>
                          </div>
                          <Badge variant="warning">
                            {PAYMENT_MODE_LABELS[ticket.paymentMode] ?? ticket.paymentMode}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2 text-center text-xs">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold tabular-nums">{formatMoney(total, CURRENCY.USD)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payé</p>
                            <p className="font-semibold tabular-nums">{formatMoney(paid, CURRENCY.USD)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reste</p>
                            <p className="font-bold tabular-nums text-brand-orange">
                              {formatMoney(remaining, CURRENCY.USD)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Vol {formatDate(ticket.travelDate)}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {freightDebts.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Package className="h-4 w-4" />
                Fret
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {freightDebts.map((shipment) => {
                  const remaining = parseFloat(shipment.remainingAmount) || 0
                  return (
                    <Card key={shipment.id} className="rounded-2xl border-border/80 shadow-sm">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/freight/${shipment.id}`}
                              className="font-mono text-sm font-semibold text-primary hover:underline"
                            >
                              {shipment.ltaNumber}
                            </Link>
                            <p className="truncate text-sm text-muted-foreground">
                              {shipment.senderName} → {shipment.receiverName}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {FREIGHT_PAYMENT_MODE_LABELS[shipment.paymentMode] ?? shipment.paymentMode}
                          </Badge>
                        </div>
                        <p className={cn('text-lg font-bold tabular-nums text-brand-orange')}>
                          Reste {formatMoney(remaining, shipment.currency ?? CURRENCY.USD)}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {checkInDebts.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Scale className="h-4 w-4" />
                Check-in — à destination
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {checkInDebts.map((checkIn) => (
                  <Card key={checkIn.id} className="rounded-2xl border-border/80 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      <Link
                        to={`/checkins/${checkIn.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {checkIn.id}
                      </Link>
                      <p className="font-medium">
                        {getCheckInPassengerName(checkIn) ?? getCheckInTicketNumber(checkIn)}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {checkIn.destinationObservations}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
