import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Download,
  FileText,
  Globe,
  History,
  MapPin,
  Pencil,
  Printer,
  Receipt,
  RotateCcw,
  Ticket,
  Trash2,
  User,
} from 'lucide-react'
import {
  useTicket,
  useTicketGroup,
  useReportTicketTravelDate,
  useUpdateTicketStatus,
  usePayTicket,
  useDeleteTicket,
} from '@/hooks/useTickets'
import { useAuth } from '@/hooks/useAuth'
import {
  canEditTicketContent,
  canHardDeleteTicket,
  formatTicketEditWindowLabel,
  isTicketWithinEditWindow,
} from '@/lib/ticket-edit'
import { useTicketActivities } from '@/hooks/useActivities'
import { mergeTicketHistory } from '@/lib/ticket-history'
import { EntityHistoryTimeline } from '@/components/history/EntityHistoryTimeline'
import { getUserRefLabel } from '@/lib/user-ref'
import {
  CURRENCY,
  TICKET_SOURCE,
  TICKET_SOURCE_LABELS,
  TICKET_STATUS,
  TICKET_STATUS_LABELS,
  TRIP_LEG,
  TRIP_LEG_LABELS,
  TRIP_TYPE,
  TRIP_TYPE_LABELS,
  PAYMENT_MODE_LABELS,
  GENDER_LABELS,
  TICKET_CATEGORY_LABELS,
  normalizeCurrency,
  type TicketSource,
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
import {
  formatBirthDateDisplay,
  getReservationHoldInfo,
  getTicketPaidAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
  getTicketTripLeg,
  isOnlineTicketSource,
  isRoundTripTicket,
  isTicketFullyPaid,
  normalizeTicketSource,
  toTicketPaymentPayload,
  toTicketReportTravelDatePayload,
} from '@/lib/ticket'
import {
  TICKET_BUSINESS_RULES,
  TICKET_CANCEL_POLICY,
  TICKET_UNPAID_TRAVEL_MESSAGE,
  canCancelTicketByPolicy,
  getTicketCancelPolicy,
  getTicketCancelPolicyMessage,
  getTicketRefundPreviewAmount,
} from '@/constants/ticket-business-rules'
import type { Ticket as TicketResource } from '@/types/ticket'
import { downloadTicketReceiptPdf, printTicketReceiptPdf } from '@/lib/ticket-receipt-pdf'
import {
  downloadTicketThermalReceiptPdf,
  printTicketThermalReceiptPdf,
} from '@/lib/ticket-thermal-receipt-pdf'
import { toast } from 'sonner'
import type { TicketReportTravelDateFormData } from '@/schemas/ticket-report-travel-date.schema'
import type { TicketPaymentFormData } from '@/schemas/ticket-payment.schema'
import { TicketReportTravelDateModal } from '@/components/tickets/TicketReportTravelDateModal'
import { TicketContactActions } from '@/components/tickets/TicketContactActions'
import { toTelHref } from '@/lib/phone'
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

type StatusConfirm = {
  title: string
  description: string
  confirmLabel: string
  variant: ConfirmDialogVariant
}

function getStatusConfirm(ticket: TicketResource, status: TicketStatus): StatusConfirm | undefined {
  if (status === TICKET_STATUS.ISSUED) {
    return {
      title: 'Émettre ce billet ?',
      description: 'Le billet est soldé. Il passera au statut Émis et pourra être utilisé au check-in.',
      confirmLabel: 'Oui, émettre',
      variant: 'success',
    }
  }
  if (status === TICKET_STATUS.USED) {
    return {
      title: 'Marquer comme utilisé ?',
      description:
        'Le passager a embarqué. Ce billet sera définitivement marqué comme utilisé et ne pourra plus être modifié.',
      confirmLabel: 'Oui, marquer utilisé',
      variant: 'success',
    }
  }
  if (status === TICKET_STATUS.CANCELLED) {
    const policy = getTicketCancelPolicy(ticket)
    const policyMessage = getTicketCancelPolicyMessage(ticket)
    if (policy === TICKET_CANCEL_POLICY.NOSHOW) {
      return {
        title: 'Annulation impossible',
        description: policyMessage,
        confirmLabel: 'Compris',
        variant: 'destructive',
      }
    }
    const penaltyNote =
      policy === TICKET_CANCEL_POLICY.PENALTY
        ? ` Pénalité de ${TICKET_BUSINESS_RULES.cancelPenaltyUsd} USD à encaisser manuellement.`
        : ''
    return {
      title: 'Annuler ce billet ?',
      description: `${policyMessage}${penaltyNote} Cette action est irréversible.`,
      confirmLabel:
        policy === TICKET_CANCEL_POLICY.PENALTY
          ? `Oui, annuler (pénalité ${TICKET_BUSINESS_RULES.cancelPenaltyUsd} $)`
          : 'Oui, annuler',
      variant: 'destructive',
    }
  }
  if (status === TICKET_STATUS.REFUNDED) {
    const policy = getTicketCancelPolicy(ticket)
    if (policy === TICKET_CANCEL_POLICY.NOSHOW) {
      return {
        title: 'Remboursement impossible',
        description: `Dans les ${TICKET_BUSINESS_RULES.noshowWithinHours} h avant embarquement : billet caduc (noshow).`,
        confirmLabel: 'Compris',
        variant: 'warning',
      }
    }
    const refundAmount = getTicketRefundPreviewAmount(ticket)
    return {
      title: 'Rembourser ce billet ?',
      description: `Remboursement CGU : 50 % du prix payé → ${formatMoney(refundAmount, CURRENCY.USD)}. Des sorties de caisse (non validées) seront créées.`,
      confirmLabel: 'Oui, rembourser 50 %',
      variant: 'warning',
    }
  }
  return undefined
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const ticketId = id ?? ''
  const { data: ticket, isLoading } = useTicket(ticketId)
  const { data: groupData } = useTicketGroup(ticket?.purchaseGroupId)
  const { data: activitiesData, isLoading: activitiesLoading } = useTicketActivities(ticketId)
  const updateStatus = useUpdateTicketStatus()
  const reportTravelDate = useReportTicketTravelDate()
  const payTicket = usePayTicket()
  const deleteTicket = useDeleteTicket()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [reportTravelDateOpen, setReportTravelDateOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [printReceiptOpen, setPrintReceiptOpen] = useState(false)
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4')
  const [activeTab, setActiveTab] = useState<TicketDetailTab>('details')

  const companions = useMemo(() => {
    if (!ticket?.purchaseGroupId) return []
    return (groupData?.items ?? []).filter((t) => t.id !== ticket.id)
  }, [ticket, groupData?.items])

  const linkedTicket = useMemo(() => {
    if (!ticket?.linkedTicketId) return null
    return companions.find((t) => t.id === ticket.linkedTicketId) ?? null
  }, [ticket?.linkedTicketId, companions])

  const otherPassengers = useMemo(() => {
    if (!ticket) return companions
    return companions.filter(
      (t) => t.id !== ticket.linkedTicketId && t.passengerName !== ticket.passengerName,
    )
  }, [companions, ticket])

  const groupPassengerCount = useMemo(() => {
    if (!ticket) return 0
    const names = new Set<string>([ticket.passengerName])
    for (const t of companions) names.add(t.passengerName)
    return names.size
  }, [ticket, companions])

  const issuedCompanions = useMemo(
    () => companions.filter((t) => t.status === TICKET_STATUS.ISSUED),
    [companions],
  )

  const canGroupCheckIn =
    ticket?.status === TICKET_STATUS.ISSUED && issuedCompanions.length > 0

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
  const canEditFields = canEditTicketContent(ticket, user?.roles)
  const editWindowExpired =
    ticket.status === TICKET_STATUS.ISSUED && !isTicketWithinEditWindow(ticket)
  const editDeadlineLabel = formatTicketEditWindowLabel(ticket)
  const isReserved = ticket.status === TICKET_STATUS.RESERVED
  const canDeleteReserved = canHardDeleteTicket(ticket)
  const total = getTicketTotalAmount(ticket)
  const paid = getTicketPaidAmount(ticket)
  const remaining = getTicketRemainingAmount(ticket)
  const money = (amount: number) => formatMoney(amount, ticket.currency)
  const currencyLabel = normalizeCurrency(ticket.currency)
  const cancelPolicy = getTicketCancelPolicy(ticket)
  const canCancelByPolicy = canCancelTicketByPolicy(ticket)
  const canRefundByPolicy = cancelPolicy !== TICKET_CANCEL_POLICY.NOSHOW
  const confirm = pendingAction ? getStatusConfirm(ticket, pendingAction) : undefined

  const handleConfirmStatus = async () => {
    if (!pendingAction) return
    if (
      pendingAction === TICKET_STATUS.CANCELLED
      && !canCancelByPolicy
    ) {
      setPendingAction(null)
      return
    }
    if (
      pendingAction === TICKET_STATUS.REFUNDED
      && !canRefundByPolicy
    ) {
      setPendingAction(null)
      return
    }
    await updateStatus.mutateAsync({ id: ticketId, status: pendingAction })
    setPendingAction(null)
  }

  const handleHardDelete = async () => {
    await deleteTicket.mutateAsync(ticketId)
    setDeleteConfirmOpen(false)
    void navigate('/tickets/reservations')
  }

  const actionPending =
    updateStatus.isPending || reportTravelDate.isPending || payTicket.isPending || deleteTicket.isPending

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
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge variant={statusVariant(ticket.status) as 'default'} className="px-3 py-1 text-sm">
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
                {isRoundTripTicket(ticket) && (
                  <Badge variant="secondary" className="px-3 py-1">
                    {TRIP_LEG_LABELS[getTicketTripLeg(ticket)]}
                    {' · '}
                    {TRIP_TYPE_LABELS[TRIP_TYPE.ROUND_TRIP]}
                  </Badge>
                )}
                {isOnlineTicketSource(ticket.source) && (
                  <Badge variant="outline" className="gap-1 border-brand-orange/40 text-brand-orange">
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    {TICKET_SOURCE_LABELS[TICKET_SOURCE.ONLINE]}
                  </Badge>
                )}
              </div>
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

      {activeTab === 'details' && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="flex flex-wrap gap-2 p-4">
            <Button
              type="button"
              className="h-11 rounded-xl bg-brand-orange hover:bg-brand-orange/90"
              onClick={() => {
                setPrintFormat('a4')
                setPrintReceiptOpen(true)
              }}
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                downloadTicketReceiptPdf(ticket)
                toast.success('Reçu billet téléchargé')
              }}
            >
              <Download className="h-4 w-4" />
              Télécharger le reçu
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                downloadTicketThermalReceiptPdf(ticket)
                toast.success('Reçu thermique 80 mm téléchargé')
              }}
            >
              <Download className="h-4 w-4" />
              Thermique 80 mm
            </Button>
            {ticket.status === TICKET_STATUS.ISSUED && (
              <Button
                type="button"
                variant={canGroupCheckIn ? 'default' : 'outline'}
                className="h-11 rounded-xl"
                asChild
              >
                <Link to={`/checkins/new?ticket=${encodeURIComponent(ticket.id)}`}>
                  <ClipboardCheck className="h-4 w-4" />
                  {canGroupCheckIn
                    ? `Check-in groupé (${issuedCompanions.length + 1})`
                    : 'Check-in'}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'details' && linkedTicket && (
        <Card className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Billet {getTicketTripLeg(ticket) === TRIP_LEG.OUTBOUND ? 'retour' : 'aller'} lié
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Aller-retour — le trajet jumelé partage le même achat.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <Link
              to={`/tickets/${linkedTicket.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3 transition-colors hover:border-brand-orange/40 hover:bg-muted/30"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-primary">{linkedTicket.ticketNumber}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {TRIP_LEG_LABELS[getTicketTripLeg(linkedTicket)]} · {formatDate(linkedTicket.travelDate)}
                </p>
              </div>
              <Badge variant="secondary">
                {TRIP_LEG_LABELS[getTicketTripLeg(linkedTicket)]}
              </Badge>
            </Link>
          </CardContent>
        </Card>
      )}

      {activeTab === 'details' && otherPassengers.length > 0 && (
        <Card className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Achat groupé — {groupPassengerCount} passagers
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              {canGroupCheckIn
                ? `${issuedCompanions.length + 1} billet(s) émis prêts pour un check-in groupé (franchise cumulée).`
                : 'Les passagers du même achat apparaissent ici. Le check-in groupé nécessite au moins 2 billets émis.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {otherPassengers.map((companion) => (
              <Link
                key={companion.id}
                to={`/tickets/${companion.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3 transition-colors hover:border-brand-orange/40 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{companion.passengerName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{companion.ticketNumber}</p>
                </div>
                <Badge variant="outline">
                  {TICKET_STATUS_LABELS[companion.status] ?? companion.status}
                </Badge>
              </Link>
            ))}
            {canGroupCheckIn && (
              <Button type="button" className="mt-2 h-11 w-full rounded-xl" asChild>
                <Link to={`/checkins/new?ticket=${encodeURIComponent(ticket.id)}`}>
                  <ClipboardCheck className="h-4 w-4" />
                  Lancer le check-in groupé
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'details' && ticket.status === TICKET_STATUS.RESERVED && (() => {
        const hold = getReservationHoldInfo(ticket.createdAt)
        if (!hold) return null
        return (
          <Card
            className={cn(
              'rounded-2xl shadow-sm',
              hold.expired
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-amber-500/30 bg-amber-500/5',
            )}
          >
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="font-medium text-foreground">
                  {hold.expired
                    ? `Hold ${TICKET_BUSINESS_RULES.unpaidReservationHoldHours} h dépassé`
                    : `Hold réservation — expire dans ${hold.label}`}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Les réservations non payées sont annulées automatiquement après{' '}
                  {TICKET_BUSINESS_RULES.unpaidReservationHoldHours} h (cron
                  {' '}
                  <span className="font-mono text-xs">app:tickets:expire-unpaid-reservations</span>
                  ).
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {canModify && activeTab === 'details' && editWindowExpired && !canEditFields && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Fenêtre d&apos;édition de 24 h expirée
            {editDeadlineLabel ? ` (depuis le ${editDeadlineLabel})` : ''}.
            Seul un administrateur peut encore modifier ce billet. Annulation / embarquement restent possibles.
          </CardContent>
        </Card>
      )}

      {canModify && activeTab === 'details' && canEditFields && editDeadlineLabel && (
        <p className="text-xs text-muted-foreground">
          Modification possible jusqu&apos;au {editDeadlineLabel}
        </p>
      )}

      {/* Actions desktop */}
      {canModify && activeTab === 'details' && (
        <TicketActions
          ticketId={ticket.id}
          onStatus={setPendingAction}
          onReportTravelDate={() => setReportTravelDateOpen(true)}
          pending={actionPending}
          canEdit={canEditFields}
          canMarkUsed={isTicketFullyPaid(ticket)}
          canCancel={canCancelByPolicy}
          canRefund={canRefundByPolicy}
          cancelPolicyMessage={getTicketCancelPolicyMessage(ticket)}
          className="hidden lg:grid"
        />
      )}

      {isReserved && activeTab === 'details' && (
        <Card className="hidden rounded-2xl border-brand-orange/30 bg-brand-orange/5 shadow-sm lg:block">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Billet réservé</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {paid > 0
                  ? `Reste à encaisser : ${money(remaining)} (déjà payé ${money(paid)}).`
                  : `Encaissez ${money(remaining)} pour émettre le billet, ou un acompte partiel.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" asChild className="h-11 shrink-0 rounded-xl">
              <Link to={`/tickets/${ticket.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Modifier
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl"
              onClick={() => setReportTravelDateOpen(true)}
              disabled={actionPending}
            >
              <CalendarClock className="h-4 w-4" />
              Modifier la date
            </Button>
            {canDeleteReserved ? (
              <Button
                type="button"
                variant="destructive"
                className="h-11 shrink-0 rounded-xl"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={actionPending}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                className="h-11 shrink-0 rounded-xl"
                onClick={() => setPendingAction(TICKET_STATUS.CANCELLED)}
                disabled={actionPending || !canCancelByPolicy}
                title={!canCancelByPolicy ? getTicketCancelPolicyMessage(ticket) : undefined}
              >
                <Ban className="h-4 w-4" />
                Annuler
              </Button>
            )}
            {remaining <= 0 ? (
              <Button
                type="button"
                className="h-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setPendingAction(TICKET_STATUS.ISSUED)}
                disabled={actionPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                Émettre le billet
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 shrink-0 rounded-xl bg-brand-orange hover:bg-brand-orange/90"
                onClick={() => setPaymentModalOpen(true)}
                disabled={actionPending}
              >
                <Banknote className="h-4 w-4" />
                Valider la réservation
              </Button>
            )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'details' ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailSection title="Passager" icon={User}>
          <DetailRow label="Nom" value={ticket.passengerName} />
          {ticket.category && (
            <DetailRow label="Catégorie" value={TICKET_CATEGORY_LABELS[ticket.category]} />
          )}
          {ticket.birthDate && (
            <DetailRow label="Date de naissance" value={formatBirthDateDisplay(ticket.birthDate)} />
          )}
          {ticket.age != null && (
            <DetailRow label="Âge" value={`${ticket.age} ans`} />
          )}
          <DetailRow label="Sexe" value={GENDER_LABELS[ticket.gender]} />
          {ticket.phone && (
            <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2.5 last:border-0">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Téléphone</p>
                <a
                  href={toTelHref(ticket.phone) ?? undefined}
                  className="font-medium text-primary hover:underline"
                >
                  {ticket.phone}
                </a>
              </div>
              <TicketContactActions
                phone={ticket.phone}
                passengerName={ticket.passengerName}
                size="sm"
              />
            </div>
          )}
        </DetailSection>

        <DetailSection title="Voyage" icon={MapPin}>
          {isRoundTripTicket(ticket) && (
            <>
              <DetailRow label="Type" value={TRIP_TYPE_LABELS[TRIP_TYPE.ROUND_TRIP]} />
              <DetailRow label="Trajet" value={TRIP_LEG_LABELS[getTicketTripLeg(ticket)]} />
            </>
          )}
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
          <DetailRow
            label="Canal"
            value={TICKET_SOURCE_LABELS[normalizeTicketSource(ticket.source) as TicketSource]}
          />
          {ticket.trackingCode && (
            <DetailRow label="Code de suivi" value={ticket.trackingCode} />
          )}
          {ticket.status === TICKET_STATUS.RESERVED && ticket.createdAt && (() => {
            const hold = getReservationHoldInfo(ticket.createdAt)
            if (!hold) return null
            return (
              <div className="border-b border-border/40 py-2.5 last:border-0">
                <p className="text-xs text-muted-foreground">Hold réservation</p>
                <p
                  className={cn(
                    'mt-0.5 flex items-center gap-1.5 text-sm font-medium',
                    hold.expired ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {hold.expired
                    ? `Dépassé (${TICKET_BUSINESS_RULES.unpaidReservationHoldHours} h)`
                    : `${hold.label} restantes · expire le ${formatDateTime(hold.expiresAt.toISOString())}`}
                </p>
              </div>
            )
          })()}
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
          <DetailRow label="Montant payé" value={money(paid)} />
          {remaining > 0 && <DetailRow label="Reste à payer" value={money(remaining)} />}
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
              canEdit={canEditFields}
              canMarkUsed={isTicketFullyPaid(ticket)}
              canCancel={canCancelByPolicy}
              canRefund={canRefundByPolicy}
              cancelPolicyMessage={getTicketCancelPolicyMessage(ticket)}
              layout="mobile"
            />
          </div>
        </div>
      )}

      {isReserved && activeTab === 'details' && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
          <div className="mx-auto flex max-w-3xl gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="destructive"
              className="h-11 shrink-0 rounded-xl px-3"
              onClick={() =>
                canDeleteReserved
                  ? setDeleteConfirmOpen(true)
                  : setPendingAction(TICKET_STATUS.CANCELLED)
              }
              disabled={
                actionPending
                || (!canDeleteReserved && !canCancelByPolicy)
              }
              title={
                !canDeleteReserved && !canCancelByPolicy
                  ? getTicketCancelPolicyMessage(ticket)
                  : undefined
              }
              aria-label={canDeleteReserved ? 'Supprimer la réservation' : 'Annuler la réservation'}
            >
              {canDeleteReserved ? <Trash2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              onClick={() => setReportTravelDateOpen(true)}
              disabled={actionPending}
            >
              <CalendarClock className="h-4 w-4" />
              Date
            </Button>
            {remaining <= 0 ? (
              <Button
                type="button"
                className="h-11 flex-[1.4] rounded-xl bg-emerald-600 font-semibold hover:bg-emerald-700"
                onClick={() => setPendingAction(TICKET_STATUS.ISSUED)}
                disabled={actionPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                Émettre
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 flex-[1.4] rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90"
                onClick={() => setPaymentModalOpen(true)}
                disabled={actionPending}
              >
                <Banknote className="h-4 w-4" />
                Valider
              </Button>
            )}
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

      <ConfirmDialog
        open={printReceiptOpen}
        onOpenChange={setPrintReceiptOpen}
        variant="default"
        title="Imprimer le reçu"
        description="Choisissez le format, puis OK pour ouvrir le PDF et lancer l’impression."
        confirmLabel="OK — Imprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (printFormat === 'thermal') {
            printTicketThermalReceiptPdf(ticket)
          } else {
            printTicketReceiptPdf(ticket)
          }
          setPrintReceiptOpen(false)
          toast.success(
            printFormat === 'thermal'
              ? 'Impression thermique prête'
              : 'Impression du reçu prête',
          )
        }}
      >
        <div className="space-y-2" role="radiogroup" aria-label="Format du reçu">
          <label
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition-colors',
              printFormat === 'a4'
                ? 'border-brand-orange/50 bg-brand-orange/10'
                : 'border-border/70 hover:bg-muted/40',
            )}
          >
            <input
              type="radio"
              name="ticket-print-format"
              className="mt-1"
              checked={printFormat === 'a4'}
              onChange={() => setPrintFormat('a4')}
            />
            <span>
              <span className="font-medium">Reçu A4</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Facture complète avec conditions du contrat
              </span>
            </span>
          </label>
          <label
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition-colors',
              printFormat === 'thermal'
                ? 'border-brand-orange/50 bg-brand-orange/10'
                : 'border-border/70 hover:bg-muted/40',
            )}
          >
            <input
              type="radio"
              name="ticket-print-format"
              className="mt-1"
              checked={printFormat === 'thermal'}
              onChange={() => setPrintFormat('thermal')}
            />
            <span>
              <span className="font-medium">Thermique 80 mm</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Ticket court pour imprimante de caisse
              </span>
            </span>
          </label>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => { if (!open && !deleteTicket.isPending) setDeleteConfirmOpen(false) }}
        variant="destructive"
        title="Supprimer définitivement ?"
        description="Cette réservation non payée sera effacée. Irréversible — utilisez Annuler si un acompte a été versé."
        confirmLabel="Oui, supprimer"
        cancelLabel="Non, revenir"
        onConfirm={handleHardDelete}
        loading={deleteTicket.isPending}
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
  canEdit = true,
  canMarkUsed = true,
  canCancel = true,
  canRefund = true,
  cancelPolicyMessage,
  className,
  layout = 'desktop',
}: {
  ticketId: string
  onStatus: (status: TicketStatus) => void
  onReportTravelDate: () => void
  pending: boolean
  canEdit?: boolean
  canMarkUsed?: boolean
  canCancel?: boolean
  canRefund?: boolean
  cancelPolicyMessage?: string
  className?: string
  layout?: 'desktop' | 'mobile'
}) {
  const btnClass = 'h-11 rounded-xl font-semibold'
  const usedDisabled = pending || !canMarkUsed
  const usedTitle = canMarkUsed ? undefined : TICKET_UNPAID_TRAVEL_MESSAGE
  const cancelDisabled = pending || !canCancel
  const refundDisabled = pending || !canRefund
  const policyTitle = !canCancel || !canRefund ? cancelPolicyMessage : undefined

  if (layout === 'mobile') {
    return (
      <div className={cn('space-y-2', className)}>
        {canEdit && (
          <Button variant="outline" asChild className={cn(btnClass, 'w-full border-primary/30 text-primary hover:bg-primary/5')}>
            <Link to={`/tickets/${ticketId}/edit`}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className={cn(btnClass, 'w-full')}
          onClick={onReportTravelDate}
          disabled={pending || !canEdit}
        >
          <CalendarClock className="h-4 w-4" />
          Reporter la date
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            className={cn(btnClass, 'bg-emerald-600 text-white hover:bg-emerald-700')}
            onClick={() => onStatus(TICKET_STATUS.USED)}
            disabled={usedDisabled}
            title={usedTitle}
          >
            <CheckCircle2 className="h-4 w-4" />
            Utilisé
          </Button>
          <Button
            type="button"
            className={cn(btnClass, 'bg-brand-orange text-white hover:bg-brand-orange/90')}
            onClick={() => onStatus(TICKET_STATUS.REFUNDED)}
            disabled={refundDisabled}
            title={policyTitle}
          >
            <RotateCcw className="h-4 w-4" />
            Rembourser
          </Button>
        </div>
        {!canMarkUsed && (
          <p className="text-xs text-destructive">{TICKET_UNPAID_TRAVEL_MESSAGE}</p>
        )}
        <Button
          type="button"
          variant="destructive"
          className={cn(btnClass, 'w-full')}
          onClick={() => onStatus(TICKET_STATUS.CANCELLED)}
          disabled={cancelDisabled}
          title={policyTitle}
        >
          <Ban className="h-4 w-4" />
          Annuler le billet
        </Button>
        {(!canCancel || !canRefund) && cancelPolicyMessage && (
          <p className="text-xs text-destructive">{cancelPolicyMessage}</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {canEdit && (
        <Button variant="outline" asChild className={cn(btnClass, 'border-primary/30 text-primary hover:bg-primary/5')}>
          <Link to={`/tickets/${ticketId}/edit`}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        className={btnClass}
        onClick={onReportTravelDate}
        disabled={pending || !canEdit}
      >
        <CalendarClock className="h-4 w-4" />
        Reporter la date
      </Button>
      <Button
        type="button"
        className={cn(btnClass, 'bg-emerald-600 text-white hover:bg-emerald-700')}
        onClick={() => onStatus(TICKET_STATUS.USED)}
        disabled={usedDisabled}
        title={usedTitle}
      >
        <CheckCircle2 className="h-4 w-4" />
        Marquer utilisé
      </Button>
      <Button
        type="button"
        className={cn(btnClass, 'bg-brand-orange text-white hover:bg-brand-orange/90')}
        onClick={() => onStatus(TICKET_STATUS.REFUNDED)}
        disabled={refundDisabled}
        title={policyTitle}
      >
        <RotateCcw className="h-4 w-4" />
        Rembourser
      </Button>
      <Button
        type="button"
        variant="destructive"
        className={btnClass}
        onClick={() => onStatus(TICKET_STATUS.CANCELLED)}
        disabled={cancelDisabled}
        title={policyTitle}
      >
        <Ban className="h-4 w-4" />
        Annuler
      </Button>
      {!canMarkUsed && (
        <p className="sm:col-span-2 text-xs text-destructive">{TICKET_UNPAID_TRAVEL_MESSAGE}</p>
      )}
      {(!canCancel || !canRefund) && cancelPolicyMessage && (
        <p className="sm:col-span-2 text-xs text-destructive">{cancelPolicyMessage}</p>
      )}
    </div>
  )
}
