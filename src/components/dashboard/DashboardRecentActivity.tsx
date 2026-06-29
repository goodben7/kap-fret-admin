import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  MapPin,
  Package,
  Plane,
  Scale,
  Ticket,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardSkeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useRecentShipments, useRecentTickets } from '@/hooks/useDashboard'
import { getCheckpointDisplayName, getCheckpointLabelFromRef } from '@/lib/checkpoint'
import { extractResourceId } from '@/lib/hydra'
import { getTicketTotal } from '@/lib/ticket'
import { formatDate, formatMoney, cn } from '@/lib/utils'
import {
  TICKET_STATUS,
  TICKET_STATUS_LABELS,
  normalizeCurrency,
  type TicketStatus,
} from '@/constants/ticket'
import {
  FREIGHT_STATUS_LABELS,
  freightStatusBadgeVariant,
  type FreightStatus,
} from '@/constants/freight'
import type { StatsFilters } from '@/types/stats'
import type { Ticket as TicketEntity } from '@/types/ticket'
import type { FreightShipment } from '@/types/freight-shipment'
import type { Checkpoint } from '@/types/checkpoint'

function ticketStatusVariant(status: TicketStatus) {
  if (status === TICKET_STATUS.ISSUED) return 'default'
  if (status === TICKET_STATUS.RESERVED) return 'warning'
  if (status === TICKET_STATUS.USED) return 'success'
  if (status === TICKET_STATUS.REFUNDED) return 'secondary'
  return 'destructive'
}

function resolveCheckpointShort(checkpoint: string | Checkpoint | undefined): string {
  if (!checkpoint) return '—'
  const embedded = getCheckpointLabelFromRef(checkpoint)
  if (embedded) return embedded.replace(/\s*\([^)]*\)\s*$/, '').trim() || embedded
  if (typeof checkpoint === 'object') {
    const label = getCheckpointDisplayName(checkpoint)
    return label.replace(/\s*\([^)]*\)\s*$/, '').trim() || label
  }
  return extractResourceId(checkpoint) ?? '—'
}

function formatRoute(
  from: string | Checkpoint | undefined,
  to: string | Checkpoint | undefined,
): string {
  return `${resolveCheckpointShort(from)} → ${resolveCheckpointShort(to)}`
}

function RecentRow({
  to,
  ariaLabel,
  children,
}: {
  to: string
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3',
        'transition-colors hover:border-border/80 hover:bg-brand-orange/5 active:bg-brand-orange/10',
      )}
    >
      {children}
    </Link>
  )
}

function RecentTicketsList({ tickets }: { tickets: TicketEntity[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {tickets.map((ticket) => (
        <li key={ticket['@id']}>
          <RecentRow to={`/tickets/${ticket.id}`} ariaLabel={`Voir le billet ${ticket.ticketNumber}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Ticket className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">{ticket.ticketNumber}</span>
                <Badge variant={ticketStatusVariant(ticket.status) as 'default'} className="h-5 px-1.5 text-[10px]">
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
              </div>
              <p className="truncate text-sm font-medium">{ticket.passengerName}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {formatRoute(ticket.departure, ticket.destination)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {formatDate(ticket.travelDate)}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <p className="text-sm font-bold tabular-nums text-brand-orange">
                {formatMoney(getTicketTotal(ticket), ticket.currency)}
              </p>
              <ChevronRight
                className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-brand-orange"
                aria-hidden="true"
              />
            </div>
          </RecentRow>
        </li>
      ))}
    </ul>
  )
}

function RecentShipmentsList({ shipments }: { shipments: FreightShipment[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {shipments.map((shipment) => {
        const total = parseFloat(shipment.totalAmount) || 0
        const currency = normalizeCurrency(shipment.currency)

        return (
          <li key={shipment['@id']}>
            <RecentRow
              to={`/freight/${shipment.id}`}
              ariaLabel={`Voir l'expédition ${shipment.ltaNumber}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
                <Package className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{shipment.ltaNumber}</span>
                  <Badge
                    variant={freightStatusBadgeVariant(shipment.status) as 'default'}
                    className="h-5 px-1.5 text-[10px]"
                  >
                    {FREIGHT_STATUS_LABELS[shipment.status as FreightStatus]}
                  </Badge>
                </div>
                <p className="inline-flex items-center gap-1.5 truncate text-sm font-medium">
                  <Plane className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />
                  {shipment.airline}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {formatRoute(shipment.loadingPlace, shipment.unloadingPlace)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {formatDate(shipment.shipmentDate)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Scale className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {shipment.totalWeight} kg · {shipment.packageCount} colis
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="text-sm font-bold tabular-nums text-brand-orange">
                  {formatMoney(total, currency)}
                </p>
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-brand-orange"
                  aria-hidden="true"
                />
              </div>
            </RecentRow>
          </li>
        )
      })}
    </ul>
  )
}

function RecentSectionCard({
  title,
  icon: Icon,
  count,
  viewAllHref,
  isLoading,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string
  icon: typeof Ticket
  count?: number
  viewAllHref: string
  isLoading: boolean
  isEmpty: boolean
  emptyIcon: typeof Ticket
  emptyTitle: string
  emptyDescription: string
  children: ReactNode
}) {
  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {count != null && count > 0 && (
              <p className="text-xs text-muted-foreground">{count} élément{count !== 1 ? 's' : ''} affiché{count !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        <Link
          to={viewAllHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Voir tout
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <CardSkeleton />
        ) : isEmpty ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

interface DashboardRecentActivityProps {
  filters?: Pick<StatsFilters, 'startDate' | 'endDate'>
  limit?: number
}

export function DashboardRecentActivity({ filters, limit = 5 }: DashboardRecentActivityProps) {
  const { data: recentTickets, isLoading: ticketsLoading } = useRecentTickets(filters, limit)
  const { data: recentShipments, isLoading: shipmentsLoading } = useRecentShipments(filters, limit)

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Activité récente</h2>
        {filters?.startDate && filters?.endDate && (
          <span className="text-xs text-muted-foreground">
            · période {formatDate(filters.startDate)} – {formatDate(filters.endDate)}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentSectionCard
          title="Billets récents"
          icon={Ticket}
          count={recentTickets?.length}
          viewAllHref="/tickets"
          isLoading={ticketsLoading}
          isEmpty={!recentTickets?.length}
          emptyIcon={Ticket}
          emptyTitle="Aucun billet récent"
          emptyDescription="Les derniers billets émis apparaîtront ici."
        >
          {recentTickets && <RecentTicketsList tickets={recentTickets} />}
        </RecentSectionCard>

        <RecentSectionCard
          title="Expéditions récentes"
          icon={Package}
          count={recentShipments?.length}
          viewAllHref="/freight"
          isLoading={shipmentsLoading}
          isEmpty={!recentShipments?.length}
          emptyIcon={Package}
          emptyTitle="Aucune expédition récente"
          emptyDescription="Les dernières expéditions fret apparaîtront ici."
        >
          {recentShipments && <RecentShipmentsList shipments={recentShipments} />}
        </RecentSectionCard>
      </div>
    </section>
  )
}
