import { FREIGHT_STATUS, type FreightStatus } from '@/constants/freight'
import { CURRENCY, TICKET_STATUS, normalizeCurrency, type Currency } from '@/constants/ticket'
import { CHECK_IN_STATUS } from '@/constants/check-in'
import { getTicketPaidAmount, getTicketRemainingAmount, getTicketTotalAmount } from '@/lib/ticket'
import { getCheckInCurrency } from '@/lib/check-in'
import { formatFreightCheckpointLabel } from '@/lib/freight'
import { ticketService } from '@/services/ticket.service'
import { freightService } from '@/services/freight.service'
import { checkInService } from '@/services/checkin.service'
import type { Ticket } from '@/types/ticket'
import type { FreightShipment } from '@/types/freight-shipment'
import type { CheckIn } from '@/types/check-in'

export interface FlightReportCriteria {
  flightDate: string
  departure: string
  destination: string
  flightNumber?: string
}

export interface MoneyByCurrency {
  usd: number
  cdf: number
}

export interface FlightProfitabilitySection {
  count: number
  weightKg: number
  total: MoneyByCurrency
  paid: MoneyByCurrency
  remaining: MoneyByCurrency
}

export interface FlightProfitabilityReport {
  criteria: FlightReportCriteria
  departureLabel: string
  destinationLabel: string
  routeLabel: string
  /** Billets du vol (hors annulés / remboursés) */
  tickets: FlightProfitabilitySection
  /** Fret réellement parti : SENT / ARRIVED / DELIVERED */
  freightShipped: FlightProfitabilitySection
  /** Fret encore PENDING sur le même trajet/date (info, hors rentabilité expédiée) */
  freightPending: FlightProfitabilitySection
  /** Excédent bagages check-in (séparé du fret) */
  excessBaggage: FlightProfitabilitySection
  /** Totaux rentabilité = billets + fret expédié + excédent bagages */
  combined: FlightProfitabilitySection
  ticketItems: Ticket[]
  freightShippedItems: FreightShipment[]
  freightPendingItems: FreightShipment[]
  excessBaggageItems: CheckIn[]
}

const SHIPPED_FREIGHT_STATUSES: FreightStatus[] = [
  FREIGHT_STATUS.SENT,
  FREIGHT_STATUS.ARRIVED,
  FREIGHT_STATUS.DELIVERED,
]

function emptyMoney(): MoneyByCurrency {
  return { usd: 0, cdf: 0 }
}

function emptySection(): FlightProfitabilitySection {
  return {
    count: 0,
    weightKg: 0,
    total: emptyMoney(),
    paid: emptyMoney(),
    remaining: emptyMoney(),
  }
}

function addMoney(target: MoneyByCurrency, currency: Currency, amount: number) {
  if (!Number.isFinite(amount) || amount === 0) return
  if (currency === CURRENCY.CDF) target.cdf += amount
  else target.usd += amount
}

function sumSections(
  ...sections: FlightProfitabilitySection[]
): FlightProfitabilitySection {
  const result = emptySection()
  for (const section of sections) {
    result.count += section.count
    result.weightKg += section.weightKg
    result.total.usd += section.total.usd
    result.total.cdf += section.total.cdf
    result.paid.usd += section.paid.usd
    result.paid.cdf += section.paid.cdf
    result.remaining.usd += section.remaining.usd
    result.remaining.cdf += section.remaining.cdf
  }
  return result
}

function isActiveTicket(ticket: Ticket): boolean {
  return ticket.status !== TICKET_STATUS.CANCELLED && ticket.status !== TICKET_STATUS.REFUNDED
}

function aggregateTickets(tickets: Ticket[]): FlightProfitabilitySection {
  const section = emptySection()
  for (const ticket of tickets) {
    if (!isActiveTicket(ticket)) continue
    const currency = normalizeCurrency(ticket.currency)
    const total = getTicketTotalAmount(ticket)
    const paid = getTicketPaidAmount(ticket)
    const remaining = getTicketRemainingAmount(ticket)
    section.count += 1
    addMoney(section.total, currency, total)
    addMoney(section.paid, currency, paid)
    addMoney(section.remaining, currency, remaining)
  }
  return section
}

function aggregateFreight(shipments: FreightShipment[]): FlightProfitabilitySection {
  const section = emptySection()
  for (const shipment of shipments) {
    const currency = normalizeCurrency(shipment.currency)
    const total = parseFloat(shipment.totalAmount) || 0
    const paid = parseFloat(shipment.paidAmount) || 0
    const remaining = parseFloat(shipment.remainingAmount) || Math.max(0, total - paid)
    const weight = parseFloat(shipment.totalWeight) || 0
    section.count += 1
    section.weightKg += weight
    addMoney(section.total, currency, total)
    addMoney(section.paid, currency, paid)
    addMoney(section.remaining, currency, remaining)
  }
  return section
}

function isActiveCheckIn(checkIn: CheckIn): boolean {
  return checkIn.status !== CHECK_IN_STATUS.CANCELLED
}

function aggregateExcessBaggage(checkIns: CheckIn[]): {
  section: FlightProfitabilitySection
  items: CheckIn[]
} {
  const section = emptySection()
  const items: CheckIn[] = []

  for (const checkIn of checkIns) {
    if (!isActiveCheckIn(checkIn)) continue
    const excessPrice = parseFloat(checkIn.excessPrice) || 0
    const netToPay = parseFloat(checkIn.netToPay) || 0
    const total = excessPrice > 0 ? excessPrice : netToPay
    if (total <= 0.001) continue

    const currency = getCheckInCurrency(checkIn)
    const remaining = Math.max(0, netToPay)
    const paid = Math.max(0, total - remaining)

    section.count += 1
    section.weightKg += parseFloat(checkIn.excessWeightKg) || 0
    addMoney(section.total, currency, total)
    addMoney(section.paid, currency, paid)
    addMoney(section.remaining, currency, remaining)
    items.push(checkIn)
  }

  return { section, items }
}

export async function fetchFlightProfitabilityReport(
  criteria: FlightReportCriteria,
): Promise<FlightProfitabilityReport> {
  const [ticketsResult, freightResult, checkInsResult] = await Promise.all([
    ticketService.getAll({
      travelDate: criteria.flightDate,
      departure: criteria.departure,
      destination: criteria.destination,
      page: 1,
      itemsPerPage: 500,
    }),
    freightService.getAll({
      shipmentDate: criteria.flightDate,
      loadingPlace: criteria.departure,
      unloadingPlace: criteria.destination,
      page: 1,
      itemsPerPage: 500,
    }),
    checkInService.getAll({
      travelDate: criteria.flightDate,
      departure: criteria.departure,
      destination: criteria.destination,
      page: 1,
      itemsPerPage: 500,
    }),
  ])

  const ticketItems = (ticketsResult.items ?? []).filter(isActiveTicket)
  const freightAll = freightResult.items ?? []
  const freightShippedItems = freightAll.filter((s) =>
    SHIPPED_FREIGHT_STATUSES.includes(s.status),
  )
  const freightPendingItems = freightAll.filter((s) => s.status === FREIGHT_STATUS.PENDING)

  const tickets = aggregateTickets(ticketItems)
  const freightShipped = aggregateFreight(freightShippedItems)
  const freightPending = aggregateFreight(freightPendingItems)
  const { section: excessBaggage, items: excessBaggageItems } = aggregateExcessBaggage(
    checkInsResult.items ?? [],
  )

  const departureLabel = formatFreightCheckpointLabel(criteria.departure)
  const destinationLabel = formatFreightCheckpointLabel(criteria.destination)

  return {
    criteria,
    departureLabel,
    destinationLabel,
    routeLabel: `${departureLabel} – ${destinationLabel}`,
    tickets,
    freightShipped,
    freightPending,
    excessBaggage,
    combined: sumSections(tickets, freightShipped, excessBaggage),
    ticketItems,
    freightShippedItems,
    freightPendingItems,
    excessBaggageItems,
  }
}

export function formatMoneyByCurrency(money: MoneyByCurrency): string {
  const parts: string[] = []
  if (money.usd > 0.001) {
    parts.push(
      `${money.usd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`,
    )
  }
  if (money.cdf > 0.001) {
    parts.push(
      `${money.cdf.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Fc`,
    )
  }
  return parts.length > 0 ? parts.join(' · ') : '0,00 $'
}
