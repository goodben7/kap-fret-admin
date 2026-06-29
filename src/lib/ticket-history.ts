import { getActivityLabel } from '@/constants/activity'
import { getUserRefLabel } from '@/lib/user-ref'
import type { Activity } from '@/types/activity'
import type { Ticket, TicketUserRef } from '@/types/ticket'

export interface TicketHistoryEntry {
  id: string
  date: string
  label: string
  actor?: string
  source: 'ticket' | 'activity'
}

function pushEntry(
  entries: TicketHistoryEntry[],
  id: string,
  date: string | undefined,
  label: string,
  source: 'ticket' | 'activity',
  actor?: string | TicketUserRef,
) {
  if (!date) return

  entries.push({
    id,
    date,
    label,
    actor: getUserRefLabel(actor),
    source,
  })
}

export function buildTicketHistoryFromTicket(ticket: Ticket): TicketHistoryEntry[] {
  const entries: TicketHistoryEntry[] = []

  pushEntry(entries, 'ticket-created', ticket.createdAt, 'Création du billet', 'ticket')
  pushEntry(entries, 'ticket-issued', ticket.issuedAt, 'Émission du billet', 'ticket', ticket.issuingAgent)
  pushEntry(
    entries,
    'ticket-travel-date-changed',
    ticket.travelDateChangedAt,
    ticket.travelDateChangeComment
      ? `Report de date de voyage — ${ticket.travelDateChangeComment}`
      : 'Report de date de voyage',
    'ticket',
    ticket.travelDateChangedBy,
  )
  pushEntry(entries, 'ticket-used', ticket.usedAt, 'Utilisation du billet', 'ticket', ticket.usedBy)
  pushEntry(entries, 'ticket-refunded', ticket.refundedAt, 'Remboursement du billet', 'ticket', ticket.refundedBy)
  pushEntry(entries, 'ticket-cancelled', ticket.cancelledAt, 'Annulation du billet', 'ticket', ticket.cancelledBy)

  if (
    ticket.updatedAt &&
    ticket.createdAt &&
    ticket.updatedAt !== ticket.createdAt
  ) {
    pushEntry(entries, 'ticket-updated', ticket.updatedAt, 'Dernière modification', 'ticket')
  } else if (ticket.updatedAt && !ticket.createdAt) {
    pushEntry(entries, 'ticket-updated', ticket.updatedAt, 'Dernière modification', 'ticket')
  }

  return entries
}

export function buildTicketHistoryFromActivities(activities: Activity[]): TicketHistoryEntry[] {
  return activities.map((item) => ({
    id: `activity-${item.id}`,
    date: item.date,
    label: getActivityLabel(item.activity),
    actor: getUserRefLabel(item.triggeredBy),
    source: 'activity' as const,
  }))
}

export function mergeTicketHistory(
  ticket: Ticket,
  activities: Activity[],
): TicketHistoryEntry[] {
  const combined = [
    ...buildTicketHistoryFromTicket(ticket),
    ...buildTicketHistoryFromActivities(activities),
  ]

  return combined.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}
