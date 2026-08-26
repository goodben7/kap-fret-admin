import { resolveCheckpointIri } from '@/lib/checkpoint'
import { extractIri, toIri } from '@/lib/hydra'
import { convertAmountBetweenCurrencyCodes } from '@/lib/exchange-rate'
import type { ExchangeRateResource } from '@/types/exchange-rate'
import { GENDER, PAYMENT_MODE, CURRENCY, TICKET_CATEGORY_BASE_PRICE_USD, TICKET_STATUS } from '@/constants/ticket'
import type { Currency, Gender, PaymentMode, TicketCategory } from '@/constants/ticket'
import type { Ticket, TicketBatchCreatePayload, TicketCreatePayload, TicketPatchPayload, TicketReportTravelDatePayload, TicketPaymentPayload } from '@/types/ticket'
import type { TicketFormData, TicketPatchFormData } from '@/schemas/ticket.schema'
import type { TicketReportTravelDateFormData } from '@/schemas/ticket-report-travel-date.schema'
import type { TicketPaymentFormData } from '@/schemas/ticket-payment.schema'

function formatDecimal(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

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

/** Plus anciens en premier (createdAt croissant, puis n° billet). */
export function sortTicketsByCreatedAtAsc<
  T extends Pick<Ticket, 'createdAt' | 'id' | 'ticketNumber'>,
>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => {
    const timeA = a.createdAt ? Date.parse(a.createdAt) : Number.NaN
    const timeB = b.createdAt ? Date.parse(b.createdAt) : Number.NaN
    const hasA = Number.isFinite(timeA)
    const hasB = Number.isFinite(timeB)

    if (hasA && hasB && timeA !== timeB) return timeA - timeB
    if (hasA && !hasB) return -1
    if (!hasA && hasB) return 1

    const numberCmp = String(a.ticketNumber ?? '').localeCompare(
      String(b.ticketNumber ?? ''),
      undefined,
      { numeric: true },
    )
    if (numberCmp !== 0) return numberCmp

    return String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, { numeric: true })
  })
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

export function getBasePriceForCategory(
  category: TicketCategory,
  pricesByCategory?: Partial<Record<TicketCategory, string>>,
): string {
  const fromApi = pricesByCategory?.[category]?.trim()
  if (fromApi) return fromApi
  return TICKET_CATEGORY_BASE_PRICE_USD[category]
}

export function getTicketPaidAmount(ticket: Pick<Ticket, 'paidAmount' | 'totalAmount' | 'basePrice' | 'tva' | 'fpt' | 'rva'>): number {
  if (ticket.paidAmount != null && ticket.paidAmount !== '') {
    return parseFloat(ticket.paidAmount) || 0
  }
  return 0
}

export function getTicketTotalAmount(ticket: Pick<Ticket, 'totalAmount' | 'basePrice' | 'tva' | 'fpt' | 'rva'>): number {
  if (ticket.totalAmount != null && ticket.totalAmount !== '') {
    return parseFloat(ticket.totalAmount) || 0
  }
  return getTicketTotal(ticket)
}

export function getTicketRemainingAmount(
  ticket: Pick<Ticket, 'paidAmount' | 'totalAmount' | 'basePrice' | 'tva' | 'fpt' | 'rva'>,
): number {
  const remaining = getTicketTotalAmount(ticket) - getTicketPaidAmount(ticket)
  return remaining > 0 ? remaining : 0
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
  const primary = data.passengers[0]
  if (!primary) {
    throw new Error('Au moins un passager est requis')
  }

  const payload: TicketCreatePayload = {
    passengerName: primary.passengerName,
    category: primary.category,
    gender: primary.gender,
    phone: data.phone ?? '',
    departure: data.departure,
    destination: data.destination,
    travelDate: toTravelDateIso(data.travelDate, data.travelTime),
    travelTime: data.travelTime,
    basePrice: String(primary.basePrice),
    currency: CURRENCY.USD,
    paymentCurrency: data.paymentCurrency,
    tva: String(primary.tva),
    fpt: String(primary.fpt),
    rva: String(primary.rva),
    baggageAllowanceKg: String(primary.baggageAllowanceKg),
    paymentMode: data.paymentMode,
    sponsor: data.sponsor?.trim() || null,
  }

  const ticketNumber = primary.ticketNumber?.trim()
  if (ticketNumber) {
    payload.ticketNumber = ticketNumber
  }

  if (primary.age !== undefined) {
    payload.age = primary.age
  }

  if (data.paymentMode === PAYMENT_MODE.CASH && data.cashRegister?.trim() && !data.reserveForLater) {
    payload.cashRegister = data.cashRegister
  }

  if (
    data.paymentMode === PAYMENT_MODE.CASH
    && !data.reserveForLater
    && data.mixedPayment
  ) {
    payload.paidAmountUsd = formatDecimal(data.paidAmountUsd || '0')
    payload.paidAmountCdf = formatDecimal(data.paidAmountCdf || '0')
    payload.paymentCurrency = CURRENCY.USD
  }

  return payload
}

/** Payload POST /api/tickets/batch — achat groupé (1+ passagers). */
export function toTicketBatchPayload(data: TicketFormData): TicketBatchCreatePayload {
  const payload: TicketBatchCreatePayload = {
    phone: data.phone ?? '',
    departure: data.departure,
    destination: data.destination,
    travelDate: toTravelDateIso(data.travelDate, data.travelTime),
    travelTime: data.travelTime,
    currency: CURRENCY.USD,
    paymentCurrency: data.paymentCurrency,
    paymentMode: data.paymentMode,
    sponsor: data.sponsor?.trim() || null,
    passengers: data.passengers.map((passenger) => {
      const row: TicketBatchCreatePayload['passengers'][number] = {
        passengerName: passenger.passengerName,
        category: passenger.category,
        gender: passenger.gender,
        basePrice: formatDecimal(passenger.basePrice),
        tva: formatDecimal(passenger.tva),
        fpt: formatDecimal(passenger.fpt),
        rva: formatDecimal(passenger.rva),
        baggageAllowanceKg: formatDecimal(passenger.baggageAllowanceKg),
      }
      const ticketNumber = passenger.ticketNumber?.trim()
      if (ticketNumber) row.ticketNumber = ticketNumber
      if (passenger.age !== undefined) row.age = passenger.age
      return row
    }),
  }

  if (data.paymentMode === PAYMENT_MODE.CASH && data.cashRegister?.trim() && !data.reserveForLater) {
    payload.cashRegister = data.cashRegister
  }

  if (
    data.paymentMode === PAYMENT_MODE.CASH
    && !data.reserveForLater
    && data.mixedPayment
  ) {
    payload.paidAmountUsd = formatDecimal(data.paidAmountUsd || '0')
    payload.paidAmountCdf = formatDecimal(data.paidAmountCdf || '0')
    payload.paymentCurrency = CURRENCY.USD
  }

  return payload
}

export function getTicketFormGroupTotal(data: Pick<TicketFormData, 'passengers'>): number {
  return data.passengers.reduce((sum, passenger) => {
    return sum + getTicketTotal({
      basePrice: passenger.basePrice,
      tva: passenger.tva,
      fpt: passenger.fpt,
      rva: passenger.rva,
    })
  }, 0)
}

export function buildTicketPaymentDescription(ticket: Pick<Ticket, 'ticketNumber' | 'passengerName'>): string {
  return `Paiement billet ${ticket.ticketNumber} — ${ticket.passengerName}`
}

export function getTicketPaymentAmount(ticket: Pick<Ticket, 'basePrice' | 'tva' | 'fpt' | 'rva' | 'paidAmount' | 'totalAmount'>): string {
  return getTicketRemainingAmount(ticket).toFixed(2)
}

export function toTicketPaymentPayload(
  ticket: Pick<Ticket, 'ticketNumber' | 'passengerName' | 'basePrice' | 'tva' | 'fpt' | 'rva' | 'paidAmount' | 'totalAmount'>,
  data: TicketPaymentFormData,
): TicketPaymentPayload {
  if (data.mixedPayment) {
    return {
      paymentCurrency: CURRENCY.USD,
      paidAmountUsd: data.paidAmountUsd?.trim() || '0',
      paidAmountCdf: data.paidAmountCdf?.trim() || '0',
      cashRegister: data.cashRegister,
      description: data.description.trim(),
    }
  }

  return {
    amount: data.amount?.trim() || getTicketPaymentAmount(ticket),
    paymentCurrency: data.paymentCurrency,
    cashRegister: data.cashRegister,
    description: data.description.trim(),
  }
}

/** Payload PATCH — champs modifiables API */
export function toTicketPatchPayload(data: TicketPatchFormData): TicketPatchPayload {
  const payload: TicketPatchPayload = {
    ticketNumber: data.ticketNumber.trim(),
    passengerName: data.passengerName,
    gender: data.gender,
    phone: data.phone ?? '',
    departure: data.departure,
    destination: data.destination,
    travelDate: toTravelDateIso(data.travelDate, data.travelTime),
    travelTime: data.travelTime,
    basePrice: formatDecimal(data.basePrice),
    tva: formatDecimal(data.tva),
    fpt: formatDecimal(data.fpt),
    rva: formatDecimal(data.rva),
    baggageAllowanceKg: formatDecimal(data.baggageAllowanceKg),
    paymentMode: data.paymentMode,
    sponsor: data.sponsor ?? '',
  }
  if (data.category) {
    payload.category = data.category
  }
  if (data.age !== undefined) {
    payload.age = data.age
  }
  return payload
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

function toFormPaymentMode(mode: PaymentMode): TicketFormData['paymentMode'] {
  if (mode === PAYMENT_MODE.CASH || mode === PAYMENT_MODE.ACC || mode === PAYMENT_MODE.PTA) {
    return mode
  }
  return PAYMENT_MODE.CASH
}

export function ticketToFormDefaults(ticket: Ticket): Partial<TicketPatchFormData> {
  return {
    ticketNumber: ticket.ticketNumber,
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
    tva: ticket.tva,
    fpt: ticket.fpt,
    rva: ticket.rva,
    baggageAllowanceKg: ticket.baggageAllowanceKg,
    paymentMode: toFormPaymentMode(ticket.paymentMode),
    sponsor: ticket.sponsor ?? '',
  }
}
