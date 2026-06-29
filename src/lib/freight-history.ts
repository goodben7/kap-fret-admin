import { getActivityLabel } from '@/constants/activity'
import { getUserRefLabel } from '@/lib/user-ref'
import type { Activity } from '@/types/activity'
import type { FreightShipment, FreightUserRef } from '@/types/freight-shipment'

export interface FreightHistoryEntry {
  id: string
  date: string
  label: string
  actor?: string
  source: 'freight' | 'activity'
}

function pushEntry(
  entries: FreightHistoryEntry[],
  id: string,
  date: string | undefined,
  label: string,
  source: 'freight' | 'activity',
  actor?: string | FreightUserRef,
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

export function buildFreightHistoryFromShipment(shipment: FreightShipment): FreightHistoryEntry[] {
  const entries: FreightHistoryEntry[] = []

  pushEntry(entries, 'freight-created', shipment.createdAt, 'Création de l\'expédition', 'freight')
  pushEntry(entries, 'freight-sent', shipment.sentAt, 'Expédition envoyée', 'freight', shipment.sentBy)
  pushEntry(entries, 'freight-arrived', shipment.arrivedAt, 'Arrivée à destination', 'freight', shipment.arrivedBy)
  pushEntry(entries, 'freight-delivered', shipment.deliveredAt, 'Livraison effectuée', 'freight', shipment.deliveredBy)
  pushEntry(entries, 'freight-cancelled', shipment.cancelledAt, 'Annulation de l\'expédition', 'freight', shipment.cancelledBy)

  if (
    shipment.updatedAt &&
    shipment.createdAt &&
    shipment.updatedAt !== shipment.createdAt
  ) {
    pushEntry(entries, 'freight-updated', shipment.updatedAt, 'Dernière modification', 'freight')
  } else if (shipment.updatedAt && !shipment.createdAt) {
    pushEntry(entries, 'freight-updated', shipment.updatedAt, 'Dernière modification', 'freight')
  }

  return entries
}

export function buildFreightHistoryFromActivities(activities: Activity[]): FreightHistoryEntry[] {
  return activities.map((item) => ({
    id: `activity-${item.id}`,
    date: item.date,
    label: getActivityLabel(item.activity),
    actor: getUserRefLabel(item.triggeredBy),
    source: 'activity' as const,
  }))
}

export function mergeFreightHistory(
  shipment: FreightShipment,
  activities: Activity[],
): FreightHistoryEntry[] {
  const combined = [
    ...buildFreightHistoryFromShipment(shipment),
    ...buildFreightHistoryFromActivities(activities),
  ]

  return combined.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}
