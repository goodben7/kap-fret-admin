import { CHECK_IN_EXCESS_PRICE_PER_KG_USD } from '@/constants/check-in'
import {
  BAGGAGE_TYPE,
  BAGGAGE_TYPE_LABELS,
  CHECK_IN_HAND_BAGGAGE_ALLOWANCE_KG,
  CHECK_IN_HAND_HOLD_BAGGAGE_ALLOWANCE_KG,
  CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG,
  type BaggageType,
} from '@/constants/check-in-baggage'
import { CURRENCY, normalizeCurrency, type Currency } from '@/constants/ticket'
import { convertAmountBetweenCurrencyCodes } from '@/lib/exchange-rate'
import { extractResourceId } from '@/lib/hydra'
import type { ExchangeRateResource } from '@/types/exchange-rate'
import type { CheckIn, CheckInBaggage, CheckInCreatePayload, CheckInPatchPayload } from '@/types/check-in'
import type { CheckInBaggageItemFormData, CheckInCreateFormData, CheckInPatchFormData } from '@/schemas/checkin.schema'
import type { IssuingOffice } from '@/types/issuing-office'
import type { Ticket } from '@/types/ticket'

export function formatDecimal(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

function parseFlexibleDate(value: string | undefined): number {
  if (!value?.trim()) return 0

  const isoTs = Date.parse(value)
  if (!Number.isNaN(isoTs)) return isoTs

  const frMatch = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/)
  if (frMatch) {
    const [, day, month, year, hours = '00', minutes = '00'] = frMatch
    const frTs = Date.parse(`${year}-${month}-${day}T${hours}:${minutes}:00`)
    if (!Number.isNaN(frTs)) return frTs
  }

  return 0
}

/** Normalise les champs Hydra / JSON (camelCase + snake_case) */
export function normalizeCheckInResource(checkIn: CheckIn): CheckIn {
  const raw = checkIn as CheckIn & Record<string, unknown>
  return {
    ...checkIn,
    createdAt: raw.createdAt ?? (raw.created_at as string | undefined),
    updatedAt: raw.updatedAt ?? (raw.updated_at as string | undefined),
    encodedAt: raw.encodedAt ?? (raw.encoded_at as string | undefined),
  }
}

function getCheckInSortTimestamp(item: {
  createdAt?: string
  updatedAt?: string
  encodedAt?: string
}): number {
  for (const value of [item.createdAt, item.updatedAt, item.encodedAt]) {
    const timestamp = parseFlexibleDate(value)
    if (timestamp > 0) return timestamp
  }
  return 0
}

function compareCheckInIds(a: string | number | undefined, b: string | number | undefined): number {
  const idA = String(a ?? '')
  const idB = String(b ?? '')
  const numA = Number(idA)
  const numB = Number(idB)
  if (idA !== '' && idB !== '' && !Number.isNaN(numA) && !Number.isNaN(numB) && numB !== numA) {
    return numB - numA
  }
  return idB.localeCompare(idA, undefined, { numeric: true })
}

function compareByNewestFirst(
  a: { createdAt?: string; updatedAt?: string; encodedAt?: string; id?: string | number },
  b: { createdAt?: string; updatedAt?: string; encodedAt?: string; id?: string | number },
): number {
  const timeA = getCheckInSortTimestamp(a)
  const timeB = getCheckInSortTimestamp(b)
  if (timeB !== timeA) return timeB - timeA
  return compareCheckInIds(a.id, b.id)
}

/** Check-ins les plus récents en premier */
export function sortCheckInsByNewestFirst<
  T extends { createdAt?: string; updatedAt?: string; encodedAt?: string; id?: string | number },
>(checkIns: T[]): T[] {
  return [...checkIns].sort(compareByNewestFirst)
}

/** Bagages les plus récemment ajoutés en premier */
export function sortCheckInBaggagesByNewestFirst<
  T extends { createdAt?: string; id?: string | number },
>(baggages: T[]): T[] {
  return [...baggages].sort(compareByNewestFirst)
}

/** Excédent = max(0, poids check-in + bagage à main − franchise) — conservé pour compatibilité */
export function computeCheckInExcessWeight(
  checkInWeight: string | number | undefined,
  handBaggageWeight: string | number | undefined,
  baggageAllowanceKg: string | number | undefined,
): string {
  const weight = parseFloat(String(checkInWeight ?? ''))
  const hand = parseFloat(String(handBaggageWeight ?? ''))
  const allowance = parseFloat(String(baggageAllowanceKg ?? ''))
  if (Number.isNaN(allowance)) return '0.00'
  const checked = Number.isNaN(weight) ? 0 : weight
  const handWeight = Number.isNaN(hand) ? 0 : hand
  const totalWeight = checked + handWeight
  return Math.max(0, totalWeight - allowance).toFixed(2)
}

/** Franchise incluse selon le type de bagage (kg) */
export function getBaggageTypeAllowanceKg(baggageType: BaggageType): number {
  if (baggageType === BAGGAGE_TYPE.HAND) {
    return CHECK_IN_HAND_BAGGAGE_ALLOWANCE_KG
  }
  if (baggageType === BAGGAGE_TYPE.REGULAR) {
    return CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG
  }
  if (baggageType === BAGGAGE_TYPE.HAND_HOLD) {
    return CHECK_IN_HAND_HOLD_BAGGAGE_ALLOWANCE_KG
  }
  return 0
}

function parseBaggageWeight(weight?: string): number {
  const parsed = parseFloat(weight ?? '')
  return Number.isNaN(parsed) || parsed <= 0 ? 0 : parsed
}

function summarizeBaggages(
  baggages: Array<{ weight?: string; baggageType: BaggageType }>,
): { checkInWeight: string; handBaggageWeight: string; excessWeightKg: string } {
  let checked = 0
  let hand = 0
  let excess = 0
  let handAllowanceUsed = 0

  const sortedBaggages = [...baggages].sort((a, b) => {
    const priority = (type: BaggageType) => {
      if (type === BAGGAGE_TYPE.HAND_HOLD) return 0
      if (type === BAGGAGE_TYPE.REGULAR) return 1
      if (type === BAGGAGE_TYPE.HAND) return 2
      return 3
    }
    return priority(a.baggageType) - priority(b.baggageType)
  })

  for (const baggage of sortedBaggages) {
    const weight = parseBaggageWeight(baggage.weight)
    if (weight <= 0) continue

    if (baggage.baggageType === BAGGAGE_TYPE.OVERSIZE) {
      excess += weight
      continue
    }

    if (baggage.baggageType === BAGGAGE_TYPE.HAND) {
      const remainingHandAllowance = Math.max(0, CHECK_IN_HAND_BAGGAGE_ALLOWANCE_KG - handAllowanceUsed)
      const assignedToHand = Math.min(weight, remainingHandAllowance)
      hand += assignedToHand
      handAllowanceUsed += assignedToHand
      excess += Math.max(0, weight - assignedToHand)
      continue
    }

    if (baggage.baggageType === BAGGAGE_TYPE.HAND_HOLD) {
      const assignedToChecked = Math.min(weight, CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG)
      const assignedToHand = Math.min(
        Math.max(0, weight - CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG),
        CHECK_IN_HAND_BAGGAGE_ALLOWANCE_KG,
      )
      checked += assignedToChecked
      hand += assignedToHand
      handAllowanceUsed += assignedToHand
      excess += Math.max(0, weight - CHECK_IN_HAND_HOLD_BAGGAGE_ALLOWANCE_KG)
      continue
    }

    checked += Math.min(weight, CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG)
    excess += Math.max(0, weight - CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG)
  }

  return {
    checkInWeight: checked.toFixed(2),
    handBaggageWeight: hand.toFixed(2),
    excessWeightKg: excess.toFixed(2),
  }
}

/** Excédent calculé après répartition 15 kg soute + 5 kg main. */
export function computeExcessWeightFromBaggages(
  baggages: Array<{ weight?: string; baggageType: BaggageType }>,
): string {
  return summarizeBaggages(baggages).excessWeightKg
}

/** Poids check-in plafonné à 15 kg soute et 5 kg main ; surplus envoyé en excédent. */
export function computeWeightsFromBaggages(
  baggages: Array<{ weight?: string; baggageType: BaggageType }>,
): { checkInWeight: string; handBaggageWeight: string } {
  const { checkInWeight, handBaggageWeight } = summarizeBaggages(baggages)
  return { checkInWeight, handBaggageWeight }
}

/** Prix excédent = 5 USD × kg, converti selon la devise du check-in */
export function computeCheckInExcessPrice(
  excessWeightKg: string | number | undefined,
  currency: Currency = CURRENCY.USD,
  exchangeRates: ExchangeRateResource[] = [],
): string {
  const weight = parseFloat(String(excessWeightKg ?? ''))
  if (Number.isNaN(weight) || weight <= 0) return '0.00'
  const usdAmount = weight * CHECK_IN_EXCESS_PRICE_PER_KG_USD
  const normalized = normalizeCurrency(currency)
  if (normalized === CURRENCY.USD) return usdAmount.toFixed(2)
  const converted = convertAmountBetweenCurrencyCodes(
    usdAmount,
    CURRENCY.USD,
    normalized,
    exchangeRates,
  )
  if (converted == null) return usdAmount.toFixed(2)
  return converted.toFixed(2)
}

/** Montant à encaisser dans la devise de paiement (tarification check-in toujours en USD). */
export function computeCheckInPaymentAmount(
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

/** date (YYYY-MM-DD) pour le champ date d'encodage */
export function toEncodedAtDateInput(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date()
  if (Number.isNaN(date.getTime())) return toEncodedAtDateInput()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function encodedAtDateInputToIso(dateValue?: string | null): string {
  const trimmed = dateValue?.trim()
  if (!trimmed) return new Date().toISOString()
  const [year, month, day] = trimmed.split('-').map(Number)
  if (!year || !month || !day) return new Date().toISOString()
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString()
}

function toBaggageCreateInput(item: CheckInBaggageItemFormData) {
  return {
    weight: formatDecimal(item.weight || '0'),
    baggageType: item.baggageType,
    description: item.description?.trim() ?? '',
  }
}

function toBaggagePatchInput(item: CheckInBaggageItemFormData) {
  return {
    ...(item.id ? { id: item.id } : {}),
    weight: formatDecimal(item.weight || '0'),
    baggageType: item.baggageType,
    description: item.description?.trim() ?? '',
  }
}

function hasBaggageWeight(item: CheckInBaggageItemFormData): boolean {
  const weight = item.weight?.trim()
  return !!weight && !Number.isNaN(parseFloat(weight))
}

export function getNewCheckInBaggages(formData: CheckInPatchFormData): CheckInBaggageItemFormData[] {
  return formData.baggages.filter((baggage) => !baggage.id?.trim() && hasBaggageWeight(baggage))
}

export interface CheckInAddedBaggagePaymentDelta {
  newBaggages: CheckInBaggageItemFormData[]
  deltaExcessWeightKg: string
  deltaAmount: string
  currency: Currency
}

/** Excédent additionnel causé uniquement par les nouveaux bagages */
export function computeAddedBaggageExcessDeltaKg(
  checkIn: CheckIn,
  newBaggages: CheckInBaggageItemFormData[],
): string {
  const toBaggageInput = (b: { weight: string; baggageType: BaggageType }) => ({
    weight: b.weight,
    baggageType: b.baggageType,
  })

  const beforeExcess = parseFloat(
    computeExcessWeightFromBaggages((checkIn.baggages ?? []).map(toBaggageInput)),
  )
  const afterExcess = parseFloat(
    computeExcessWeightFromBaggages([
      ...(checkIn.baggages ?? []).map(toBaggageInput),
      ...newBaggages.map((b) => ({ weight: b.weight ?? '', baggageType: b.baggageType })),
    ]),
  )
  return Math.max(0, afterExcess - beforeExcess).toFixed(2)
}

/** Montant à encaisser pour les bagages nouvellement ajoutés lors d'une modification */
export function computeCheckInAddedBaggagePaymentDelta(
  checkIn: CheckIn,
  formData: CheckInPatchFormData,
  exchangeRates: ExchangeRateResource[] = [],
): CheckInAddedBaggagePaymentDelta | null {
  const newBaggages = getNewCheckInBaggages(formData)
  if (newBaggages.length === 0) return null

  const deltaExcessKg = computeAddedBaggageExcessDeltaKg(checkIn, newBaggages)
  const currency = normalizeCurrency(formData.currency)
  const deltaAmount = parseFloat(computeCheckInExcessPrice(deltaExcessKg, currency, exchangeRates))
  if (deltaAmount <= 0) return null

  return {
    newBaggages,
    deltaExcessWeightKg: deltaExcessKg,
    deltaAmount: deltaAmount.toFixed(2),
    currency,
  }
}

export function buildCheckInBaggageTransactionDescription(
  checkInId: string,
  newBaggages: CheckInBaggageItemFormData[],
): string {
  const count = newBaggages.length
  const label = count > 1 ? `${count} bagages ajoutés` : '1 bagage ajouté'
  return `Check-in ${checkInId} — ${label}`
}

export function toCheckInCreatePayload(data: CheckInCreateFormData): CheckInCreatePayload {
  const excess = parseFloat(data.excessWeightKg) || 0
  const payload: CheckInCreatePayload = {
    ticket: data.ticketIri,
    checkInWeight: formatDecimal(data.checkInWeight),
    baggageAllowanceKg: formatDecimal(data.baggageAllowanceKg),
    excessWeightKg: formatDecimal(data.excessWeightKg),
    excessPrice: formatDecimal(data.excessPrice),
    currency: CURRENCY.USD,
    paymentCurrency: normalizeCurrency(data.paymentCurrency),
    netToPay: formatDecimal(data.netToPay),
    handBaggageWeight: formatDecimal(data.handBaggageWeight || '0'),
    observations: data.observations?.trim() ?? '',
    encodedAt: encodedAtDateInputToIso(data.encodedAt),
    baggages: data.baggages.filter(hasBaggageWeight).map(toBaggageCreateInput),
  }

  if (excess > 0 && data.cashRegister?.trim()) {
    payload.cashRegister = data.cashRegister
  }

  return payload
}

export function toCheckInPatchPayload(data: CheckInPatchFormData): CheckInPatchPayload {
  return {
    checkInWeight: formatDecimal(data.checkInWeight),
    baggageAllowanceKg: formatDecimal(data.baggageAllowanceKg),
    excessWeightKg: formatDecimal(data.excessWeightKg),
    excessPrice: formatDecimal(data.excessPrice),
    netToPay: formatDecimal(data.netToPay),
    handBaggageWeight: formatDecimal(data.handBaggageWeight || '0'),
    observations: data.observations?.trim() ?? '',
    encodedAt: encodedAtDateInputToIso(data.encodedAt),
    baggages: data.baggages.filter(hasBaggageWeight).map(toBaggagePatchInput),
  }
}

/** Applique le montant encaissé (éventuellement modifié) au check-in existant */
export function toCheckInPatchPayloadWithBaggagePayment(
  checkIn: CheckIn,
  formData: CheckInPatchFormData,
  paidAmount: string,
): CheckInPatchPayload {
  const paid = parseFloat(paidAmount) || 0
  const prevNet = parseFloat(checkIn.netToPay) || 0
  const prevExcessPrice = parseFloat(checkIn.excessPrice) || 0

  return toCheckInPatchPayload({
    ...formData,
    excessPrice: (prevExcessPrice + paid).toFixed(2),
    netToPay: (prevNet + paid).toFixed(2),
  })
}

export function resolveCheckInBaggageFormId(baggage: CheckInBaggage): string | undefined {
  if (baggage.id != null && String(baggage.id).trim() !== '') {
    return String(baggage.id)
  }
  const fromIri = extractResourceId(baggage['@id'])
  return fromIri ?? undefined
}

export function checkInToFormDefaults(checkIn: CheckIn): Partial<CheckInPatchFormData> {
  return {
    ticketIri: typeof checkIn.ticket === 'string' ? checkIn.ticket : checkIn.ticket['@id'],
    checkInWeight: checkIn.checkInWeight,
    baggageAllowanceKg: checkIn.baggageAllowanceKg,
    excessWeightKg: checkIn.excessWeightKg,
    excessPrice: checkIn.excessPrice,
    currency: normalizeCurrency(checkIn.currency),
    netToPay: checkIn.netToPay,
    handBaggageWeight: checkIn.handBaggageWeight,
    observations: checkIn.observations ?? '',
    encodedAt: toEncodedAtDateInput(checkIn.encodedAt ?? checkIn.createdAt),
    baggages: sortCheckInBaggagesByNewestFirst(checkIn.baggages ?? []).map((baggage) => ({
      id: resolveCheckInBaggageFormId(baggage),
      weight: baggage.weight,
      baggageType: baggage.baggageType,
      description: baggage.description ?? '',
    })),
  }
}

export function getBaggageTypeLabel(type: BaggageType | string): string {
  if (type in BAGGAGE_TYPE_LABELS) {
    return BAGGAGE_TYPE_LABELS[type as BaggageType]
  }
  return type
}

export function getCheckInTicketLabel(checkIn: CheckIn): string {
  if (typeof checkIn.ticket === 'object' && 'ticketNumber' in checkIn.ticket) {
    const ticket = checkIn.ticket as Ticket
    return `${ticket.ticketNumber} — ${ticket.passengerName}`
  }
  const id = extractResourceId(typeof checkIn.ticket === 'string' ? checkIn.ticket : checkIn.ticket['@id'])
  return id ?? '—'
}

export function getCheckInTicketNumber(checkIn: CheckIn): string {
  if (typeof checkIn.ticket === 'object' && 'ticketNumber' in checkIn.ticket) {
    return checkIn.ticket.ticketNumber
  }
  const id = extractResourceId(typeof checkIn.ticket === 'string' ? checkIn.ticket : checkIn.ticket['@id'])
  return id ?? '—'
}

export function getCheckInPassengerName(checkIn: CheckIn): string | null {
  if (typeof checkIn.ticket === 'object' && 'passengerName' in checkIn.ticket) {
    return checkIn.ticket.passengerName
  }
  return null
}

export function getCheckInIssuingOfficeLabel(checkIn: CheckIn): string {
  const office = checkIn.issuingOffice
  if (!office) return '—'
  if (typeof office === 'object') return (office as IssuingOffice).name
  return extractResourceId(office) ?? office
}

export function getCheckInTicketId(checkIn: CheckIn): string | null {
  if (typeof checkIn.ticket === 'object' && checkIn.ticket.id) return checkIn.ticket.id
  return extractResourceId(typeof checkIn.ticket === 'string' ? checkIn.ticket : checkIn.ticket?.['@id'])
}

export function getCheckInCurrency(checkIn: CheckIn): Currency {
  return normalizeCurrency(checkIn.currency)
}

export function hasCheckInObservations(obs?: string | null): boolean {
  if (!obs) return false
  const trimmed = obs.trim()
  return trimmed !== '' && trimmed !== '-'
}

export function formatCheckInWeight(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isNaN(num)) return '0,00 kg'
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
}
