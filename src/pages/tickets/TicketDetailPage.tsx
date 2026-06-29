import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  History,
  MapPin,
  Pencil,
  Receipt,
  RotateCcw,
  Ticket,
  User,
} from 'lucide-react'
import { useTicket, useReportTicketTravelDate, useUpdateTicketStatus, usePayTicket } from '@/hooks/useTickets'
import { useTicketActivities } from '@/hooks/useActivities'
import { mergeTicketHistory } from '@/lib/ticket-history'
import { EntityHistoryTimeline } from '@/components/history/EntityHistoryTimeline'
import { getUserRefLabel } from '@/lib/user-ref'
import {
  TICKET_STATUS,
  TICKET_STATUS_LABELS,
  PAYMENT_MODE_LABELS,
  GENDER_LABELS,
  normalizeCurrency,
  type TicketStatus,
} from '@/constants/ticket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, type ConfirmDialogVariant } from '@/components/ui/confirm-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney, formatDate, formatDateTime, cn } from '@/lib/utils'
import { getCheckpointDisplayName } from '@/lib/checkpoint'
import { getTicketTotal, toTicketPaymentPayload, toTicketReportTravelDatePayload } from '@/lib/ticket'
import type { TicketReportTravelDateFormData } from '@/schemas/ticket-report-travel-date.schema'
import type { TicketPaymentFormData } from '@/schemas/ticket-payment.schema'
import { TicketReportTravelDateModal } from '@/components/tickets/TicketReportTravelDateModal'
import { TicketPaymentModal } from '@/components/tickets/TicketPaymentModal'
import { RelatedCashTransactionsPanel } from '@/components/cash-transactions/RelatedCashTransactionsPanel'
import { CASH_TRANSACTION_REFERENCE_TYPE } from '@/constants/cash-transaction'
import type { Checkpoint } from '@/types/checkpoint'

function getCheckpointName(cp: string | Checkpoint): string {
  return getCheckpointDisplayName(cp)
}

function statusVariant(status: TicketStatus) {
  if (status === TICKET_STATUS.ISSUED) return 'default'
  if (status === TICKET_STATUS.RESERVED) return 'warning'
  if (status === TICKET_STATUS.USED) return 'success'
  if (status === TICKET_STATUS.REFUNDED) return 'secondary'
  return 'destructive'
}

function DetailSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: typeof User
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
  href,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  href?: string
}) {
  const content = (
    <span className={cn('text-sm font-medium text-right break-words', mono && 'font-mono text-xs')}>
      {value}
    </span>
  )

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-0 last:pb-0 first:pt-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {href ? (
        <a href={href} className="text-sm font-medium text-primary hover:underline text-right break-all">
          {value}
        </a>
      ) : (
        content
      )}
    </div>
  )
}

type PendingAction = TicketStatus | null
type TicketDetailTab = 'details' | 'transactions' | 'history'

function DetailTabs({
  value,
  onChange,
}: {
  value: TicketDetailTab
  onChange: (tab: TicketDetailTab) => void
}) {
  const tabClass = (active: boolean) =>
    cn(
      'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors sm:gap-2',
      active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <div
      className="flex rounded-xl border border-border/80 bg-muted/40 p-1"
      role="tablist"
      aria-label="Sections du billet"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'details'}
        className={tabClass(value === 'details')}
        onClick={() => onChange('details')}
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Détails</span>
        <span className="sm:hidden">Détails</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'transactions'}
        className={tabClass(value === 'transactions')}
        onClick={() => onChange('transactions')}
      >
        <Receipt className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Transactions</span>
        <span className="sm:hidden">Tx</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'history'}
        className={tabClass(value === 'history')}
        onClick={() => onChange('history')}
      >
        <History className="h-4 w-4 shrink-0" aria-hidden="true" />
        Historique
      </button>
    </div>
  )
}

const STATUS_CONFIRM: Partial<
  Record<TicketStatus, { title: string; description: string; confirmLabel: string; variant: ConfirmDialogVariant }>
> = {
  [TICKET_STATUS.USED]: {
    title: 'Marquer comme utilisé ?',
    description: 'Le passager a embarqué. Ce billet sera définitivement marqué comme utilisé et ne pourra plus être modifié.',
    confirmLabel: 'Oui, marquer utilisé',
    variant: 'success',
  },
  [TICKET_STATUS.CANCELLED]: {
    title: 'Annuler ce billet ?',
    description: 'Le billet sera annulé. Cette action est irréversible et le passager ne pourra plus voyager avec ce billet.',
    confirmLabel: 'Oui, annuler le billet',
    variant: 'destructive',
  },
  [TICKET_STATUS.REFUNDED]: {
    title: 'Rembourser ce billet ?',
    description: 'Le billet sera marqué comme remboursé. Assurez-vous que le remboursement a bien été effectué.',
    confirmLabel: 'Oui, confirmer le remboursement',
    variant: 'warning',
  },
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = id ?? ''
  const { data: ticket, isLoading } = useTicket(ticketId)
  const { data: activitiesData, isLoading: activitiesLoading } = useTicketActivities(ticketId)
  const updateStatus = useUpdateTicketStatus()
  const reportTravelDate = useReportTicketTravelDate()
  const payTicket = usePayTicket()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [reportTravelDateOpen, setReportTravelDateOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TicketDetailTab>('details')

  const historyEntries = useMemo(() => {
    if (!ticket) return []
    return mergeTicketHistory(ticket, activitiesData?.items ?? [])
  }, [ticket, activitiesData?.items])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner label="Chargement du billet..." />
      </div>
    )
  }

  if (!ticket) {
    return (
      <EmptyState
        icon={Ticket}
        title="Billet introuvable"
        description="Ce billet n'existe pas ou a été supprimé."
        action={{ label: 'Retour à la billetterie', onClick: () => { window.location.href = '/tickets' } }}
      />
    )
  }

  const canModify = ticket.status === TICKET_STATUS.ISSUED
  const isReserved = ticket.status === TICKET_STATUS.RESERVED
  const total = getTicketTotal(ticket)
  const money = (amount: number) => formatMoney(amount, ticket.currency)
  const currencyLabel = normalizeCurrency(ticket.currency)
  const confirm = pendingAction ? STATUS_CONFIRM[pendingAction] : undefined

  const handleConfirmStatus = async () => {
    if (!pendingAction) return
    await updateStatus.mutateAsync({ id: ticketId, status: pendingAction })
    setPendingAction(null)
  }

  const actionPending = updateStatus.isPending || reportTravelDate.isPending || payTicket.isPending

  const handleReportTravelDate = async (data: TicketReportTravelDateFormData) => {
    await reportTravelDate.mutateAsync({
      id: ticketId,
      payload: toTicketReportTravelDatePayload(data),
    })
  }

  const handlePaymentConfirm = async (data: TicketPaymentFormData) => {
    await payTicket.mutateAsync({
      id: ticketId,
      payload: toTicketPaymentPayload(ticket, data),
    })
    setPaymentModalOpen(false)
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

      {/* En-tête */}
      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billet</p>
                <h1 className="mt-0.5 truncate font-mono text-xl font-bold tracking-tight sm:text-2xl">
                  {ticket.ticketNumber}
                </h1>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{ticket.id}</p>
              </div>
              <Badge variant={statusVariant(ticket.status) as 'default'} className="shrink-0 px-3 py-1 text-sm">
                {TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
            </div>

            <div className="flex items-end justify-between gap-4 border-t border-border/60 pt-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Passager</p>
                <p className="truncate text-lg font-semibold">{ticket.passengerName}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold tabular-nums text-brand-orange">{money(total)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailTabs value={activeTab} onChange={setActiveTab} />

      {/* Actions desktop */}
      {canModify && activeTab === 'details' && (
        <TicketActions
          ticketId={ticket.id}
          onStatus={setPendingAction}
          onReportTravelDate={() => setReportTravelDateOpen(true)}
          pending={actionPending}
          className="hidden lg:grid"
        />
      )}

      {isReserved && activeTab === 'details' && (
        <Card className="hidden rounded-2xl border-brand-orange/30 bg-brand-orange/5 shadow-sm lg:block">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Billet réservé</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Encaissez {money(total)} pour émettre le billet au passager.
              </p>
            </div>
            <Button
              type="button"
              className="h-11 shrink-0 rounded-xl bg-brand-orange hover:bg-brand-orange/90"
              onClick={() => setPaymentModalOpen(true)}
              disabled={actionPending}
            >
              <Banknote className="h-4 w-4" />
              Encaisser le billet
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'details' ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailSection title="Passager" icon={User}>
          <DetailRow label="Nom" value={ticket.passengerName} />
          <DetailRow label="Âge" value={`${ticket.age} ans`} />
          <DetailRow label="Sexe" value={GENDER_LABELS[ticket.gender]} />
          {ticket.phone && (
            <DetailRow label="Téléphone" value={ticket.phone} href={`tel:${ticket.phone}`} />
          )}
        </DetailSection>

        <DetailSection title="Voyage" icon={MapPin}>
          <DetailRow label="Départ" value={getCheckpointName(ticket.departure)} />
          <DetailRow label="Destination" value={getCheckpointName(ticket.destination)} />
          <DetailRow label="Date" value={formatDate(ticket.travelDate)} />
          <DetailRow label="Heure" value={ticket.travelTime} />
          {ticket.travelDateChangedAt && (
            <>
              <DetailRow label="Date reportée le" value={formatDateTime(ticket.travelDateChangedAt)} />
              {getUserRefLabel(ticket.travelDateChangedBy) && (
                <DetailRow label="Reporté par" value={getUserRefLabel(ticket.travelDateChangedBy)!} />
              )}
              {ticket.travelDateChangeComment && (
                <DetailRow label="Motif du report" value={ticket.travelDateChangeComment} />
              )}
            </>
          )}
          <DetailRow label="Bureau" value={ticket.issuingOfficeName ?? '—'} />
        </DetailSection>

        <DetailSection title="Tarification" icon={Banknote}>
          <DetailRow label="Devise" value={currencyLabel} />
          <DetailRow label="Prix de base" value={money(parseFloat(ticket.basePrice))} />
          <DetailRow label="TVA" value={money(parseFloat(ticket.tva))} />
          <DetailRow label="FPT" value={money(parseFloat(ticket.fpt))} />
          <DetailRow label="RVA" value={money(parseFloat(ticket.rva))} />
          <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-orange/10 px-4 py-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums text-brand-orange">{money(total)}</span>
          </div>
          <DetailRow label="Kilo total accordé" value={`${ticket.baggageAllowanceKg} kg`} />
        </DetailSection>

        <DetailSection title="Paiement" icon={CreditCard}>
          <DetailRow label="Mode" value={PAYMENT_MODE_LABELS[ticket.paymentMode]} />
          {ticket.sponsor && <DetailRow label="Sponsor" value={ticket.sponsor} />}
          {ticket.issuedAt && (
            <DetailRow label="Émis le" value={formatDateTime(ticket.issuedAt)} />
          )}
          {getUserRefLabel(ticket.issuingAgent) && (
            <DetailRow label="Agent émetteur" value={getUserRefLabel(ticket.issuingAgent)!} />
          )}
        </DetailSection>
      </div>
      ) : activeTab === 'transactions' ? (
        <RelatedCashTransactionsPanel
          referenceType={CASH_TRANSACTION_REFERENCE_TYPE.TICKET}
          referenceId={ticket.id}
          emptyDescription="Aucune transaction caisse liée à ce billet."
        />
      ) : (
        <EntityHistoryTimeline entries={historyEntries} isLoading={activitiesLoading} />
      )}

      {!canModify && !isReserved && activeTab === 'details' && (
        <Card className="rounded-2xl border-border/60 bg-muted/30">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <Ban className="h-5 w-5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            Ce billet est {TICKET_STATUS_LABELS[ticket.status].toLowerCase()} et ne peut plus être modifié.
          </CardContent>
        </Card>
      )}

      {/* Actions mobile — barre fixe */}
      {canModify && activeTab === 'details' && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
          <div className="mx-auto max-w-3xl space-y-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <TicketActions
              ticketId={ticket.id}
              onStatus={setPendingAction}
              onReportTravelDate={() => setReportTravelDateOpen(true)}
              pending={actionPending}
              layout="mobile"
            />
          </div>
        </div>
      )}

      {isReserved && activeTab === 'details' && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
          <div className="mx-auto max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90"
              onClick={() => setPaymentModalOpen(true)}
              disabled={actionPending}
            >
              <Banknote className="h-4 w-4" />
              Encaisser le billet
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingAction != null}
        onOpenChange={(open) => { if (!open && !actionPending) setPendingAction(null) }}
        variant={confirm?.variant ?? 'default'}
        title={confirm?.title ?? 'Confirmer'}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel ?? 'Confirmer'}
        cancelLabel="Non, revenir"
        onConfirm={handleConfirmStatus}
        loading={actionPending}
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Billet</span>
            <span className="font-mono font-semibold">{ticket.ticketNumber}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Passager</span>
            <span className="font-medium truncate">{ticket.passengerName}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Montant</span>
            <span className="font-bold tabular-nums text-brand-orange">{money(total)}</span>
          </div>
        </div>
      </ConfirmDialog>

      <TicketReportTravelDateModal
        open={reportTravelDateOpen}
        onOpenChange={setReportTravelDateOpen}
        ticket={ticket}
        onSubmit={handleReportTravelDate}
        isLoading={reportTravelDate.isPending}
      />

      <TicketPaymentModal
        open={paymentModalOpen}
        onOpenChange={(open) => {
          if (!open && !payTicket.isPending) setPaymentModalOpen(false)
        }}
        ticket={ticket}
        onConfirm={handlePaymentConfirm}
        isLoading={payTicket.isPending}
      />
    </div>
  )
}

function TicketActions({
  ticketId,
  onStatus,
  onReportTravelDate,
  pending,
  className,
  layout = 'desktop',
}: {
  ticketId: string
  onStatus: (status: TicketStatus) => void
  onReportTravelDate: () => void
  pending: boolean
  className?: string
  layout?: 'desktop' | 'mobile'
}) {
  const btnClass = 'h-11 rounded-xl font-semibold'

  if (layout === 'mobile') {
    return (
      <div className={cn('space-y-2', className)}>
        <Button variant="outline" asChild className={cn(btnClass, 'w-full border-primary/30 text-primary hover:bg-primary/5')}>
          <Link to={`/tickets/${ticketId}/edit`}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(btnClass, 'w-full')}
          onClick={onReportTravelDate}
          disabled={pending}
        >
          <CalendarClock className="h-4 w-4" />
          Reporter la date
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            className={cn(btnClass, 'bg-emerald-600 text-white hover:bg-emerald-700')}
            onClick={() => onStatus(TICKET_STATUS.USED)}
            disabled={pending}
          >
            <CheckCircle2 className="h-4 w-4" />
            Utilisé
          </Button>
          <Button
            type="button"
            className={cn(btnClass, 'bg-brand-orange text-white hover:bg-brand-orange/90')}
            onClick={() => onStatus(TICKET_STATUS.REFUNDED)}
            disabled={pending}
          >
            <RotateCcw className="h-4 w-4" />
            Rembourser
          </Button>
        </div>
        <Button
          type="button"
          variant="destructive"
          className={cn(btnClass, 'w-full')}
          onClick={() => onStatus(TICKET_STATUS.CANCELLED)}
          disabled={pending}
        >
          <Ban className="h-4 w-4" />
          Annuler le billet
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      <Button variant="outline" asChild className={cn(btnClass, 'border-primary/30 text-primary hover:bg-primary/5')}>
        <Link to={`/tickets/${ticketId}/edit`}>
          <Pencil className="h-4 w-4" />
          Modifier
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        className={btnClass}
        onClick={onReportTravelDate}
        disabled={pending}
      >
        <CalendarClock className="h-4 w-4" />
        Reporter la date
      </Button>
      <Button
        type="button"
        className={cn(btnClass, 'bg-emerald-600 text-white hover:bg-emerald-700')}
        onClick={() => onStatus(TICKET_STATUS.USED)}
        disabled={pending}
      >
        <CheckCircle2 className="h-4 w-4" />
        Marquer utilisé
      </Button>
      <Button
        type="button"
        className={cn(btnClass, 'bg-brand-orange text-white hover:bg-brand-orange/90')}
        onClick={() => onStatus(TICKET_STATUS.REFUNDED)}
        disabled={pending}
      >
        <RotateCcw className="h-4 w-4" />
        Rembourser
      </Button>
      <Button
        type="button"
        variant="destructive"
        className={btnClass}
        onClick={() => onStatus(TICKET_STATUS.CANCELLED)}
        disabled={pending}
      >
        <Ban className="h-4 w-4" />
        Annuler
      </Button>
    </div>
  )
}
