import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  ClipboardCheck,
  FileText,
  Luggage,
  MessageSquare,
  Pencil,
  Receipt,
  Scale,
  Ticket,
} from 'lucide-react'
import { CHECK_IN_STATUS, CHECK_IN_STATUS_LABELS } from '@/constants/check-in'
import { CASH_TRANSACTION_REFERENCE_TYPE } from '@/constants/cash-transaction'
import { CURRENCY_LABELS, normalizeCurrency } from '@/constants/ticket'
import { useCheckIn } from '@/hooks/useCheckIns'
import { RelatedCashTransactionsPanel } from '@/components/cash-transactions/RelatedCashTransactionsPanel'
import {
  formatCheckInWeight,
  getBaggageTypeLabel,
  getCheckInCurrency,
  getCheckInIssuingOfficeLabel,
  getCheckInPassengerName,
  getCheckInTicketId,
  getCheckInTicketNumber,
  hasCheckInObservations,
  sortCheckInBaggagesByNewestFirst,
} from '@/lib/check-in'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney, formatDateTime, cn } from '@/lib/utils'

function DetailSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: typeof Ticket
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('rounded-2xl border-border/80 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

function DetailRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-0 last:pb-0 first:pt-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'break-words text-right text-sm font-medium',
          mono && 'font-mono text-xs',
          highlight && 'font-semibold text-brand-orange',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function WeightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

type CheckInDetailTab = 'details' | 'transactions'

function DetailTabs({
  value,
  onChange,
}: {
  value: CheckInDetailTab
  onChange: (tab: CheckInDetailTab) => void
}) {
  const tabClass = (active: boolean) =>
    cn(
      'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
      active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <div
      className="flex rounded-xl border border-border/80 bg-muted/40 p-1"
      role="tablist"
      aria-label="Sections du check-in"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'details'}
        className={tabClass(value === 'details')}
        onClick={() => onChange('details')}
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        Détails
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'transactions'}
        className={tabClass(value === 'transactions')}
        onClick={() => onChange('transactions')}
      >
        <Receipt className="h-4 w-4 shrink-0" aria-hidden="true" />
        Transactions
      </button>
    </div>
  )
}

export function CheckInDetailPage() {
  const { id } = useParams<{ id: string }>()
  const checkInId = id ?? ''
  const [activeTab, setActiveTab] = useState<CheckInDetailTab>('details')
  const { data: checkIn, isLoading } = useCheckIn(checkInId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner label="Chargement du check-in..." />
      </div>
    )
  }

  if (!checkIn) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Check-in introuvable"
        description="Ce check-in n'existe pas ou a été supprimé."
        action={{ label: 'Retour aux check-ins', onClick: () => { window.location.href = '/checkins' } }}
      />
    )
  }

  const currency = getCheckInCurrency(checkIn)
  const paymentCurrency = normalizeCurrency(checkIn.paymentCurrency ?? checkIn.currency)
  const money = (amount: string | number) => formatMoney(parseFloat(String(amount)) || 0, currency)
  const passengerName = getCheckInPassengerName(checkIn)
  const ticketNumber = getCheckInTicketNumber(checkIn)
  const ticketId = getCheckInTicketId(checkIn)
  const excessWeight = parseFloat(checkIn.excessWeightKg) || 0
  const netToPay = parseFloat(checkIn.netToPay) || 0
  const showObservations = hasCheckInObservations(checkIn.observations)
  const baggages = sortCheckInBaggagesByNewestFirst(checkIn.baggages ?? [])
  const isCancelled = checkIn.status === CHECK_IN_STATUS.CANCELLED
  const statusLabel = checkIn.status ? (CHECK_IN_STATUS_LABELS[checkIn.status] ?? checkIn.status) : null

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28 lg:max-w-4xl lg:pb-6">
      <Link
        to="/checkins"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Check-In
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Check-in</p>
                <h1 className="mt-0.5 truncate font-mono text-xl font-bold tracking-tight sm:text-2xl">
                  {checkIn.id}
                </h1>
                {checkIn.createdAt && (
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(checkIn.createdAt)}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {statusLabel && (
                  <Badge variant={isCancelled ? 'destructive' : 'secondary'}>{statusLabel}</Badge>
                )}
                <Button variant="outline" asChild className="hidden rounded-xl lg:inline-flex">
                  <Link to={`/checkins/${checkIn.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4 border-t border-border/60 pt-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Passager</p>
                <p className="truncate text-lg font-semibold">{passengerName ?? '—'}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{ticketNumber}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">Net à payer</p>
                <p
                  className={cn(
                    'text-2xl font-bold tabular-nums',
                    netToPay > 0 ? 'text-brand-orange' : 'text-foreground',
                  )}
                >
                  {money(checkIn.netToPay)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailTabs value={activeTab} onChange={setActiveTab} />

      {activeTab === 'details' ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailSection title="Billet" icon={Ticket}>
          {ticketId ? (
            <DetailRow
              label="Billet"
              value={
                <Link to={`/tickets/${ticketId}`} className="text-primary hover:underline">
                  {ticketNumber}
                  {passengerName ? ` — ${passengerName}` : ''}
                </Link>
              }
            />
          ) : (
            <DetailRow
              label="Billet"
              value={passengerName ? `${ticketNumber} — ${passengerName}` : ticketNumber}
              mono
            />
          )}
          <DetailRow label="Bureau" value={getCheckInIssuingOfficeLabel(checkIn)} />
        </DetailSection>

        <DetailSection title="Poids" icon={Scale}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Référence billet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Kilo total accordé</p>
              </div>
              <p className="shrink-0 text-lg font-semibold tabular-nums">
                {formatCheckInWeight(checkIn.baggageAllowanceKg)}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Poids enregistrés
              </p>
              <div className="grid grid-cols-2 gap-3">
                <WeightMetric label="Bagage Soute" value={formatCheckInWeight(checkIn.checkInWeight)} />
                <WeightMetric label="Bagage à main" value={formatCheckInWeight(checkIn.handBaggageWeight)} />
              </div>
            </div>

            <div
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl px-4 py-3',
                excessWeight > 0 ? 'bg-brand-orange/10' : 'border border-border/60 bg-muted/20',
              )}
            >
              <span className="text-sm font-semibold">Excédent</span>
              <span
                className={cn(
                  'text-lg font-bold tabular-nums',
                  excessWeight > 0 ? 'text-brand-orange' : 'text-foreground',
                )}
              >
                {formatCheckInWeight(checkIn.excessWeightKg)}
              </span>
            </div>
          </div>
        </DetailSection>

        <DetailSection title="Tarification" icon={Banknote} className="lg:col-span-2">
          <div className="grid gap-0 lg:grid-cols-2 lg:gap-x-8">
            <DetailRow label="Devise" value={CURRENCY_LABELS[currency]} />
            <DetailRow label="Devise de paiement" value={CURRENCY_LABELS[paymentCurrency]} />
            <DetailRow label="Prix excédent" value={money(checkIn.excessPrice)} />
            <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-orange/10 px-4 py-3 lg:col-span-2">
              <span className="text-sm font-semibold">Net à payer</span>
              <span className="text-lg font-bold tabular-nums text-brand-orange">{money(checkIn.netToPay)}</span>
            </div>
          </div>
        </DetailSection>

        {baggages.length > 0 && (
          <DetailSection title="Bagages enregistrés" icon={Luggage} className="lg:col-span-2">
            <div className="space-y-3">
              {baggages.map((baggage) => (
                <div
                  key={baggage.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{getBaggageTypeLabel(baggage.baggageType)}</p>
                    {baggage.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{baggage.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    <span className="font-semibold tabular-nums">{formatCheckInWeight(baggage.weight)}</span>
                    {baggage.createdAt && (
                      <span className="text-xs text-muted-foreground">{formatDateTime(baggage.createdAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        {isCancelled && checkIn.cancelledAt && (
          <DetailSection title="Annulation" icon={ClipboardCheck} className="lg:col-span-2">
            <DetailRow label="Annulé le" value={formatDateTime(checkIn.cancelledAt)} />
            {checkIn.updatedAt && (
              <DetailRow label="Dernière mise à jour" value={formatDateTime(checkIn.updatedAt)} />
            )}
          </DetailSection>
        )}

        {showObservations && (
          <DetailSection title="Observations" icon={MessageSquare} className="lg:col-span-2">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{checkIn.observations}</p>
          </DetailSection>
        )}
      </div>
      ) : (
        <RelatedCashTransactionsPanel
          referenceType={CASH_TRANSACTION_REFERENCE_TYPE.CHECKIN}
          referenceId={checkIn.id}
          emptyDescription="Aucune transaction caisse liée à ce check-in."
        />
      )}

      {activeTab === 'details' && (
      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button asChild className="h-11 w-full rounded-xl font-semibold">
            <Link to={`/checkins/${checkIn.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Modifier le check-in
            </Link>
          </Button>
        </div>
      </div>
      )}
    </div>
  )
}
