import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  Plus,
  Scale,
  Ticket,
  Wallet,
  Banknote,
  FileText,
} from 'lucide-react'
import { useTickets } from '@/hooks/useTickets'
import { useFreight } from '@/hooks/useFreight'
import { useCheckIns } from '@/hooks/useCheckIns'
import {
  useCreateManualDebt,
  useManualDebts,
  usePayManualDebt,
} from '@/hooks/useManualDebts'
import { PAYMENT_MODE, TICKET_STATUS, CURRENCY, PAYMENT_MODE_LABELS } from '@/constants/ticket'
import {
  FREIGHT_PAYMENT_MODE,
  FREIGHT_PAYMENT_MODE_LABELS,
  isFreightPayAtDestination,
} from '@/constants/freight'
import {
  getTicketPaidAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
} from '@/lib/ticket'
import {
  CHECK_IN_PAYMENT_MODE_LABELS,
} from '@/constants/check-in'
import {
  getCheckInPaidAmount,
  getCheckInPassengerName,
  getCheckInPaymentMode,
  getCheckInRemainingAmount,
  getCheckInTicketNumber,
  hasCheckInOpenDebt,
} from '@/lib/check-in'
import {
  MANUAL_DEBT_STATUS,
  MANUAL_DEBT_STATUS_LABELS,
} from '@/constants/manual-debt'
import {
  getManualDebtRemaining,
  isManualDebtOpen,
  toManualDebtPaymentPayload,
} from '@/lib/manual-debt'
import { ManualDebtCreateModal } from '@/components/finance/ManualDebtCreateModal'
import { ManualDebtPaymentModal } from '@/components/finance/ManualDebtPaymentModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import type { Ticket as TicketType } from '@/types/ticket'
import type { FreightShipment } from '@/types/freight-shipment'
import type { CheckIn } from '@/types/check-in'
import type { ManualDebt } from '@/types/manual-debt'
import type { ManualDebtPaymentFormData } from '@/schemas/manual-debt.schema'
import type { ManualDebtCreatePayload } from '@/types/manual-debt'

function isTicketDebt(ticket: TicketType): boolean {
  if (ticket.status === TICKET_STATUS.CANCELLED || ticket.status === TICKET_STATUS.REFUNDED) {
    return false
  }
  if (ticket.paymentMode === PAYMENT_MODE.ACC || (ticket.paymentMode === PAYMENT_MODE.PDA || ticket.paymentMode === PAYMENT_MODE.PTA)) {
    return getTicketRemainingAmount(ticket) > 0.001
  }
  return getTicketRemainingAmount(ticket) > 0.001
}

function isFreightDebt(shipment: FreightShipment): boolean {
  const remaining = parseFloat(shipment.remainingAmount) || 0
  if (remaining <= 0.001) return false
  return (
    shipment.paymentMode === FREIGHT_PAYMENT_MODE.ACC
    || isFreightPayAtDestination(shipment.paymentMode)
    || remaining > 0
  )
}

function isCheckInDebt(checkIn: CheckIn): boolean {
  return hasCheckInOpenDebt(checkIn)
}

function debtStatusBadgeVariant(status: ManualDebt['status']): 'warning' | 'secondary' | 'success' | 'destructive' {
  switch (status) {
    case MANUAL_DEBT_STATUS.OPEN:
      return 'warning'
    case MANUAL_DEBT_STATUS.PARTIAL:
      return 'secondary'
    case MANUAL_DEBT_STATUS.SETTLED:
      return 'success'
    case MANUAL_DEBT_STATUS.CANCELLED:
      return 'destructive'
    default:
      return 'secondary'
  }
}

export function DebtsReportPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [paymentDebt, setPaymentDebt] = useState<ManualDebt | null>(null)

  const ticketsQuery = useTickets({ itemsPerPage: 200, page: 1 })
  const freightQuery = useFreight({ itemsPerPage: 200, page: 1 })
  const checkInsQuery = useCheckIns({ itemsPerPage: 200, page: 1 })
  const manualDebtsQuery = useManualDebts({
    itemsPerPage: 100,
    page: 1,
    order: { createdAt: 'desc' },
  })

  const createDebt = useCreateManualDebt()
  const payDebt = usePayManualDebt()

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
  const openManualDebts = useMemo(
    () => (manualDebtsQuery.data?.items ?? []).filter(isManualDebtOpen),
    [manualDebtsQuery.data?.items],
  )

  const ticketTotal = ticketDebts.reduce((sum, t) => sum + getTicketRemainingAmount(t), 0)
  const freightTotal = freightDebts.reduce(
    (sum, s) => sum + (parseFloat(s.remainingAmount) || 0),
    0,
  )
  const checkInTotal = checkInDebts.reduce((sum, c) => sum + getCheckInRemainingAmount(c), 0)
  const manualTotal = openManualDebts.reduce((sum, d) => sum + getManualDebtRemaining(d), 0)

  const loading =
    ticketsQuery.isLoading
    || freightQuery.isLoading
    || checkInsQuery.isLoading
    || manualDebtsQuery.isLoading
  const empty =
    !loading
    && ticketDebts.length === 0
    && freightDebts.length === 0
    && checkInDebts.length === 0
    && openManualDebts.length === 0

  const handleCreate = async (payload: ManualDebtCreatePayload) => {
    await createDebt.mutateAsync(payload)
    setCreateOpen(false)
  }

  const handlePay = async (data: ManualDebtPaymentFormData) => {
    if (!paymentDebt) return
    await payDebt.mutateAsync({
      id: paymentDebt.id,
      payload: toManualDebtPaymentPayload(paymentDebt, data),
    })
    setPaymentDebt(null)
  }

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
            Soldes ouverts — billets, fret, bagages et dettes manuelles
          </p>
        </div>
        <Button
          className="rounded-xl"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Ajouter une dette
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="mt-0.5 text-xs text-muted-foreground">{freightDebts.length} expéditions</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Bagages</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-orange">
              {formatMoney(checkInTotal, CURRENCY.USD)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{checkInDebts.length} check-in(s)</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Manuelles</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-orange">
              {formatMoney(manualTotal, CURRENCY.USD)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{openManualDebts.length} dette(s)</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <LoadingSpinner label="Chargement des dettes..." />
      ) : empty ? (
        <EmptyState
          icon={Wallet}
          title="Aucune dette ouverte"
          description="Ajoutez une dette manuelle, ou les acomptes ACC/PDA apparaîtront ici."
          action={
            <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Ajouter une dette
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {openManualDebts.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <FileText className="h-4 w-4" />
                Dettes manuelles
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {openManualDebts.map((debt) => {
                  const remaining = getManualDebtRemaining(debt)
                  const paidAmt = parseFloat(debt.paidAmount) || 0
                  const totalAmt = parseFloat(debt.amount) || 0
                  return (
                    <Card key={debt.id} className="rounded-2xl border-border/80 shadow-sm">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-muted-foreground">{debt.id}</p>
                            <p className="truncate font-medium">{debt.debtorName}</p>
                            {debt.debtorPhone?.trim() && (
                              <p className="truncate text-xs text-muted-foreground">
                                {debt.debtorPhone.trim()}
                              </p>
                            )}
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {debt.reason}
                            </p>
                          </div>
                          <Badge variant={debtStatusBadgeVariant(debt.status)}>
                            {MANUAL_DEBT_STATUS_LABELS[debt.status] ?? debt.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2 text-center text-xs">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold tabular-nums">
                              {formatMoney(totalAmt, debt.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payé</p>
                            <p className="font-semibold tabular-nums">
                              {formatMoney(paidAmt, debt.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reste</p>
                            <p className="font-bold tabular-nums text-brand-orange">
                              {formatMoney(remaining, debt.currency)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {debt.createdAt ? formatDate(debt.createdAt) : '—'}
                          </p>
                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setPaymentDebt(debt)}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Encaisser
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {ticketDebts.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Ticket className="h-4 w-4" />
                Billets
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {ticketDebts.map((ticket) => {
                  const remaining = getTicketRemainingAmount(ticket)
                  const paidAmt = getTicketPaidAmount(ticket)
                  const totalAmt = getTicketTotalAmount(ticket)
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
                            {ticket.sponsor?.trim() && (
                              <p className="truncate text-xs text-muted-foreground">
                                Consignataire : {ticket.sponsor.trim()}
                              </p>
                            )}
                          </div>
                          <Badge variant="warning">
                            {PAYMENT_MODE_LABELS[ticket.paymentMode] ?? ticket.paymentMode}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2 text-center text-xs">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold tabular-nums">{formatMoney(totalAmt, CURRENCY.USD)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payé</p>
                            <p className="font-semibold tabular-nums">{formatMoney(paidAmt, CURRENCY.USD)}</p>
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
                              Exp. {shipment.senderName}
                            </p>
                            <p className="truncate text-sm">
                              Consignataire : {shipment.receiverName}
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
                Excédent bagages
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {checkInDebts.map((checkIn) => {
                  const remaining = getCheckInRemainingAmount(checkIn)
                  const paidAmt = getCheckInPaidAmount(checkIn)
                  const totalAmt = parseFloat(checkIn.netToPay) || 0
                  const mode = getCheckInPaymentMode(checkIn)
                  return (
                    <Card key={checkIn.id} className="rounded-2xl border-border/80 shadow-sm">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/checkins/${checkIn.id}`}
                              className="font-mono text-sm font-semibold text-primary hover:underline"
                            >
                              {checkIn.id}
                            </Link>
                            <p className="truncate font-medium">
                              {getCheckInPassengerName(checkIn) ?? getCheckInTicketNumber(checkIn)}
                            </p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {getCheckInTicketNumber(checkIn)}
                            </p>
                          </div>
                          <Badge variant="warning">
                            {CHECK_IN_PAYMENT_MODE_LABELS[mode as keyof typeof CHECK_IN_PAYMENT_MODE_LABELS]
                              ?? mode}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2 text-center text-xs">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold tabular-nums">{formatMoney(totalAmt, CURRENCY.USD)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payé</p>
                            <p className="font-semibold tabular-nums">{formatMoney(paidAmt, CURRENCY.USD)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reste</p>
                            <p className="font-bold tabular-nums text-brand-orange">
                              {formatMoney(remaining, CURRENCY.USD)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <ManualDebtCreateModal
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && !createDebt.isPending) setCreateOpen(false)
        }}
        onConfirm={handleCreate}
        isLoading={createDebt.isPending}
      />

      {paymentDebt && (
        <ManualDebtPaymentModal
          open={!!paymentDebt}
          onOpenChange={(open) => {
            if (!open && !payDebt.isPending) setPaymentDebt(null)
          }}
          debt={paymentDebt}
          onConfirm={handlePay}
          isLoading={payDebt.isPending}
        />
      )}
    </div>
  )
}
