import { CHECK_IN_STATUS } from '@/constants/check-in'
import {
  getCheckInTicketId,
  getCheckInTicketNumber,
  sortCheckInsByRegistrationOrder,
} from '@/lib/check-in'
import type { CheckInFilters } from '@/lib/check-in-filters'
import { checkInService } from '@/services/checkin.service'
import type { Ticket } from '@/types/ticket'

export { sortCheckInsByRegistrationOrder } from '@/lib/check-in'

export interface CheckInRegistrationRanks {
  byTicketId: Map<string, number>
  byTicketNumber: Map<string, number>
}

function filterActiveCheckIns<T extends { status?: string }>(checkIns: T[]): T[] {
  return checkIns.filter((checkIn) => checkIn.status !== CHECK_IN_STATUS.CANCELLED)
}

/**
 * Rangs d'ordre d'enregistrement check-in pour une date de vol.
 * 0 = premier enregistré.
 */
export async function fetchCheckInRegistrationRanks(
  travelDate: string,
  options?: { departure?: string; destination?: string },
): Promise<CheckInRegistrationRanks> {
  const day = travelDate.trim()
  const empty: CheckInRegistrationRanks = {
    byTicketId: new Map(),
    byTicketNumber: new Map(),
  }
  if (!day) return empty

  const filters: CheckInFilters = {
    travelDate: day,
    departure: options?.departure?.trim() || undefined,
    destination: options?.destination?.trim() || undefined,
    status: CHECK_IN_STATUS.CREATED,
    itemsPerPage: 500,
    page: 1,
  }

  try {
    const { items } = await checkInService.getAll(filters)
    const ordered = sortCheckInsByRegistrationOrder(filterActiveCheckIns(items))

    const byTicketId = new Map<string, number>()
    const byTicketNumber = new Map<string, number>()

    ordered.forEach((checkIn, index) => {
      const ticketId = getCheckInTicketId(checkIn)
      const ticketNumber = getCheckInTicketNumber(checkIn)
      if (ticketId) byTicketId.set(String(ticketId), index)
      if (ticketNumber) byTicketNumber.set(ticketNumber, index)
    })

    return { byTicketId, byTicketNumber }
  } catch {
    return empty
  }
}

function getTicketCheckInRank(
  ticket: Pick<Ticket, 'id' | 'ticketNumber'>,
  ranks: CheckInRegistrationRanks,
): number {
  const byId = ranks.byTicketId.get(String(ticket.id))
  if (byId != null) return byId
  const byNumber = ranks.byTicketNumber.get(ticket.ticketNumber)
  if (byNumber != null) return byNumber
  return Number.POSITIVE_INFINITY
}

/**
 * Trie les billets : check-ins par ordre d'enregistrement, puis les autres
 * (sans check-in) par date de création / nom.
 */
export function sortTicketsByCheckInRegistrationOrder<T extends Ticket>(
  tickets: T[],
  ranks: CheckInRegistrationRanks,
): T[] {
  return [...tickets].sort((a, b) => {
    const rankA = getTicketCheckInRank(a, ranks)
    const rankB = getTicketCheckInRank(b, ranks)
    if (rankA !== rankB) return rankA - rankB

    const createdA = a.createdAt ? Date.parse(a.createdAt) : Number.NaN
    const createdB = b.createdAt ? Date.parse(b.createdAt) : Number.NaN
    const safeA = Number.isNaN(createdA) ? Number.POSITIVE_INFINITY : createdA
    const safeB = Number.isNaN(createdB) ? Number.POSITIVE_INFINITY : createdB
    if (safeA !== safeB) return safeA - safeB

    return a.passengerName.localeCompare(b.passengerName, 'fr')
  })
}

export async function orderTicketsByCheckInRegistration<T extends Ticket>(
  tickets: T[],
  travelDate: string,
  options?: { departure?: string; destination?: string },
): Promise<T[]> {
  if (tickets.length === 0) return tickets
  const ranks = await fetchCheckInRegistrationRanks(travelDate, options)
  if (ranks.byTicketId.size === 0 && ranks.byTicketNumber.size === 0) return tickets
  return sortTicketsByCheckInRegistrationOrder(tickets, ranks)
}
