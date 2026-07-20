import { resolveCheckpointIri } from '@/lib/checkpoint'
import { extractIri, toIri } from '@/lib/hydra'
import { convertAmountBetweenCurrencyCodes } from '@/lib/exchange-rate'
import type { ExchangeRateResource } from '@/types/exchange-rate'
import { GENDER, PAYMENT_MODE, CURRENCY, TICKET_CATEGORY_BASE_PRICE_USD, TICKET_STATUS, normalizeCurrency } from '@/constants/ticket'
import type { Currency, Gender, TicketCategory } from '@/constants/ticket'
import type { Ticket, TicketCreatePayload, TicketPatchPayload, TicketReportTravelDatePayload, TicketPaymentPayload } from '@/types/ticket'
import type { TicketFormData, TicketPatchFormData } from '@/schemas/ticket.schema'
import type { TicketReportTravelDateFormData } from '@/schemas/ticket-report-travel-date.schema'
import type { TicketPaymentFormData } from '@/schemas/ticket-payment.schema'

export function toTravelDateIso(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return `${date}T${normalizedTime}.000Z`
}

/** Valeur pour `<input type="date">` — date locale du jour */
export function getTodayTravelDateInput(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Prochain mercredi (aujourd'hui si mercredi) — format YYYY-MM-DD pour `<input type="date">` */
export function getDefaultWednesdayTravelDateInput(from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const day = date.getDay()
  const daysUntilWednesday = (3 - day + 7) % 7
  date.setDate(date.getDate() + daysUntilWednesday)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysToTravelDateInput(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Indique si la journée de vol est entièrement passée (fin de journée locale). */
export function isFlightTravelDatePassed(travelDateInput: string, from = new Date()): boolean {
  const endOfFlightDay = new Date(`${travelDateInput}T23:59:59`)
  return from > endOfFlightDay
}

/**
 * Date du prochain vol opérationnel (mercredis).
 * Si le mercredi courant est dépassé, retourne le mercredi suivant.
 */
export function getUpcomingFlightTravelDateInput(from = new Date()): string {
  let candidate = getDefaultWednesdayTravelDateInput(from)

  while (isFlightTravelDatePassed(candidate, from)) {
    candidate = addDaysToTravelDateInput(candidate, 7)
  }

  return candidate
}

/** Valeur pour `<input type="time">` — heure locale actuelle (HH:mm) */
export function getCurrentTravelTimeInput(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export function normalizeGender(value: string | undefined): Gender | undefined {
  if (value === GENDER.MALE || value === GENDER.FEMALE) return value
  if (value === 'MALE') return GENDER.MALE
  if (value === 'FEMALE') return GENDER.FEMALE
  return undefined
}

export function parseTravelDate(isoDate: string): string {
  return isoDate.split('T')[0] ?? isoDate
}

/** Affiche une date YYYY-MM-DD en JJ/MM/AAAA (sans conversion fuseau). */
export function formatTravelDateInput(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

/** Date de vol affichée — utilise la partie calendaire stockée, pas le fuseau local. */
export function formatTicketTravelDate(travelDateIso: string): string {
  return formatTravelDateInput(parseTravelDate(travelDateIso))
}

export function ticketMatchesTravelDateInput(
  ticket: Pick<Ticket, 'travelDate'>,
  dateInput: string,
): boolean {
  const day = dateInput.trim()
  if (!day) return true
  return parseTravelDate(ticket.travelDate) === day
}

export function filterTicketsByTravelDateInput<T extends Pick<Ticket, 'travelDate'>>(
  tickets: T[],
  dateInput: string,
): T[] {
  const day = dateInput.trim()
  if (!day) return tickets
  return tickets.filter((ticket) => ticketMatchesTravelDateInput(ticket, day))
}

/** Billets visibles en billetterie : hors annulés et remboursés. */
export function filterTicketsForList<T extends Pick<Ticket, 'status'>>(tickets: T[]): T[] {
  return tickets.filter(
    (ticket) =>
      ticket.status !== TICKET_STATUS.CANCELLED && ticket.status !== TICKET_STATUS.REFUNDED,
  )
}

export function getTicketTotal(ticket: Pick<Ticket, 'basePrice' | 'tva' | 'fpt' | 'rva'>): number {
  return [ticket.basePrice, ticket.tva, ticket.fpt, ticket.rva]
    .map((v) => parseFloat(String(v)) || 0)
    .reduce((sum, n) => sum + n, 0)
}

export function toIssuingOfficeIri(value: string): string {
  if (!value) return value
  if (value.startsWith('/api/')) return value
  return toIri('issuing_offices', value)
}

export function getBasePriceForCategory(category: TicketCategory): string {
  return TICKET_CATEGORY_BASE_PRICE_USD[category]
}

/** Montant à encaisser dans la devise de paiement (tarif billet toujours en USD). */
export function computeTicketPaymentAmount(
  totalUsd: number,
  paymentCurrency: Currency,
  exchangeRates: ExchangeRateResource[] = [],
): string | null {
  if (!Number.isFinite(totalUsd) || totalUsd <= 0) return null
  if (paymentCurrency === CURRENCY.USD) return totalUsd.toFixed(2)
  const converted = convertAmountBetweenCurrencyCodes(
    totalUsd,
    CURRENCY.USD,
    paymentCurrency,
    exchangeRates,
  )
  if (converted == null) return null
  return converted.toFixed(2)
}

export function toTicketCreatePayload(data: TicketFormData): TicketCreatePayload {
  const payload: TicketCreatePayload = {
    passengerName: data.passengerName,
    category: data.category,
    gender: data.gender,
    phone: data.phone ?? '',
    departure: data.departure,
    destination: data.destination,
    travelDate: toTravelDateIso(data.travelDate, data.travelTime),
    travelTime: data.travelTime,
    basePrice: String(data.basePrice),
    currency: CURRENCY.USD,
    paymentCurrency: data.paymentCurrency,
    tva: String(data.tva),
    fpt: String(data.fpt),
    rva: String(data.rva),
    baggageAllowanceKg: String(data.baggageAllowanceKg),
    paymentMode: data.paymentMode,
    sponsor: data.paymentMode === PAYMENT_MODE.SPONSOR ? (data.sponsor ?? null) : null,
  }

  if (data.age !== undefined) {
    payload.age = data.age
  }

  if (data.paymentMode === PAYMENT_MODE.CASH && data.cashRegister?.trim() && !data.reserveForLater) {
    payload.cashRegister = data.cashRegister
  }

  return payload
}

export function buildTicketPaymentDescription(ticket: Pick<Ticket, 'ticketNumber' | 'passengerName'>): string {
  return `Paiement billet ${ticket.ticketNumber} — ${ticket.passengerName}`
}

export function getTicketPaymentAmount(ticket: Pick<Ticket, 'basePrice' | 'tva' | 'fpt' | 'rva'>): string {
  return getTicketTotal(ticket).toFixed(2)
}

export function toTicketPaymentPayload(
  ticket: Pick<Ticket, 'ticketNumber' | 'passengerName' | 'basePrice' | 'tva' | 'fpt' | 'rva'>,
  data: TicketPaymentFormData,
): TicketPaymentPayload {
  return {
    amount: getTicketPaymentAmount(ticket),
    paymentCurrency: data.paymentCurrency,
    cashRegister: data.cashRegister,
    description: data.description.trim(),
  }
}

/** Payload PATCH strict — champs modifiables API uniquement */
export function toTicketPatchPayload(data: TicketPatchFormData): TicketPatchPayload {
  return {
    passengerName: data.passengerName,
    age: data.age,
    gender: data.gender,
    phone: data.phone ?? '',
    departure: data.departure,
    destination: data.destination,
    travelDate: toTravelDateIso(data.travelDate, data.travelTime),
    travelTime: data.travelTime,
    sponsor: data.sponsor ?? '',
  }
}

export function toTicketReportTravelDatePayload(
  data: TicketReportTravelDateFormData,
): TicketReportTravelDatePayload {
  return {
    travelDate: toTravelDateIso(data.travelDate, data.travelTime),
    travelTime: data.travelTime,
    comment: data.comment.trim(),
  }
}

export function getTicketIssuingOfficeLabel(ticket: Ticket): string {
  if (ticket.issuingOfficeName) return ticket.issuingOfficeName
  if (typeof ticket.issuingOffice === 'object') return ticket.issuingOffice.name
  return String(ticket.issuingOffice)
}

export function ticketToFormDefaults(ticket: Ticket): Partial<TicketFormData> {
  return {
    passengerName: ticket.passengerName,
    category: ticket.category,
    age: ticket.age,
    gender: normalizeGender(ticket.gender),
    phone: ticket.phone ?? '',
    departure: resolveCheckpointIri(
      typeof ticket.departure === 'object' ? ticket.departure : extractIri(ticket.departure) ?? ticket.departure,
    ),
    destination: resolveCheckpointIri(
      typeof ticket.destination === 'object' ? ticket.destination : extractIri(ticket.destination) ?? ticket.destination,
    ),
    travelDate: parseTravelDate(ticket.travelDate),
    travelTime: ticket.travelTime,
    basePrice: ticket.basePrice,
    paymentCurrency: ticket.paymentCurrency ?? normalizeCurrency(ticket.currency),
    tva: ticket.tva,
    fpt: ticket.fpt,
    rva: ticket.rva,
    baggageAllowanceKg: ticket.baggageAllowanceKg,
    paymentMode: ticket.paymentMode,
    sponsor: ticket.sponsor ?? '',
  }
}
