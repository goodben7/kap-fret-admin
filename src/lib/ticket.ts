import { resolveCheckpointIri } from '@/lib/checkpoint'
import { extractIri, toIri } from '@/lib/hydra'
import { GENDER, PAYMENT_MODE, normalizeCurrency } from '@/constants/ticket'
import type { Gender } from '@/constants/ticket'
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

export function toTicketCreatePayload(data: TicketFormData): TicketCreatePayload {
  const payload: TicketCreatePayload = {
    passengerName: data.passengerName,
    age: data.age,
    gender: data.gender,
    phone: data.phone ?? '',
    departure: data.departure,
    destination: data.destination,
    travelDate: toTravelDateIso(data.travelDate, data.travelTime),
    travelTime: data.travelTime,
    basePrice: String(data.basePrice),
    currency: data.currency,
    tva: String(data.tva),
    fpt: String(data.fpt),
    rva: String(data.rva),
    baggageAllowanceKg: String(data.baggageAllowanceKg),
    paymentMode: data.paymentMode,
    sponsor: data.paymentMode === PAYMENT_MODE.SPONSOR ? (data.sponsor ?? null) : null,
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
    currency: normalizeCurrency(ticket.currency),
    tva: ticket.tva,
    fpt: ticket.fpt,
    rva: ticket.rva,
    baggageAllowanceKg: ticket.baggageAllowanceKg,
    paymentMode: ticket.paymentMode,
    sponsor: ticket.sponsor ?? '',
  }
}
