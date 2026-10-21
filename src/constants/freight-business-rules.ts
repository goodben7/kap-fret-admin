import { FREIGHT_PAYMENT_MODE, FREIGHT_STATUS, NATURE_OF_GOODS } from '@/constants/freight'
import type { FreightPaymentMode, FreightStatus } from '@/constants/freight'

/**
 * Paramètres métiers fret — alignés sur CONDITIONS GENERALES DE TRANSPORT DE FRET.
 * À garder synchronisés avec App\Freight\FreightBusinessRules (API).
 */
export const FREIGHT_BUSINESS_RULES = {
  /**
   * #1 — Prix LTA payable dans les N heures après arrivée du fret.
   */
  paymentDueHoursAfterArrival: 48,

  /**
   * #3 — Enlèvement au dépôt : fret port dû / PDA.
   */
  pickupHoursPda: 48,

  /**
   * #3 — Enlèvement : fret payé cash à l'origine (ex. Kinshasa).
   */
  pickupHoursCashAtOrigin: 2,

  /**
   * #5 — Jours de grâce avant frais d'entreposage (après arrivée).
   */
  storageGraceDays: 2,

  /**
   * #5 — Taux journalier d'entreposage (fraction du prix de transport).
   * 0.10 = 10 % par jour supplémentaire.
   */
  storageDailyRate: 0.1,

  /**
   * #6 — Délai avant procédure de liquidation / mise en vente (jours après arrivée).
   * Pas de vente automatique : alerte / statut ops uniquement.
   */
  liquidationDays: 15,

  /**
   * #10 — Indemnisation max en cas de perte / vol (USD par kg).
   */
  lossRefundUsdPerKg: 1.5,
} as const

export type FreightBusinessRules = typeof FREIGHT_BUSINESS_RULES

/** Mots-clés nature de marchandise → périssable (#8, cash obligatoire). */
export const FREIGHT_PERISHABLE_KEYWORDS = [
  'oignon',
  'oeuf',
  'œuf',
  'oeufs',
  'œufs',
  'vivre',
  'vivres',
  'frais',
  'legume',
  'légume',
  'legumes',
  'légumes',
  'surgele',
  'surgelé',
  'surgeles',
  'surgelés',
  'perissable',
  'périssable',
] as const

/** Nature enum PERISHABLE ou libellé libre contenant un mot-clé (#8). */
export function isPerishableNature(natureOfGoods?: string | null): boolean {
  if (!natureOfGoods?.trim()) return false
  if (natureOfGoods === NATURE_OF_GOODS.PERISHABLE) return true
  const normalized = natureOfGoods.toLowerCase()
  return FREIGHT_PERISHABLE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  )
}

/** Au moins un colis périssable → paiement cash obligatoire. */
export function packagesContainPerishable(
  packages: Array<{ natureOfGoods?: string | null }> | null | undefined,
): boolean {
  return (packages ?? []).some((pkg) => isPerishableNature(pkg.natureOfGoods))
}

export const FREIGHT_PERISHABLE_CASH_MESSAGE =
  'Les produits périssables doivent être payés cash avant expédition (PDA/ACC interdits).'

/** Mots-clés nature → bêtes / animaux (#11–12). */
export const FREIGHT_LIVESTOCK_KEYWORDS = [
  'bete',
  'bête',
  'betes',
  'bêtes',
  'animal',
  'animaux',
  'livestock',
  'volaille',
  'chevres',
  'chèvres',
  'chevre',
  'chèvre',
  'mouton',
  'moutons',
  'porc',
  'porcs',
  'boeuf',
  'bœuf',
  'boeufs',
  'bœufs',
] as const

export function isLivestockNature(natureOfGoods?: string | null): boolean {
  if (!natureOfGoods?.trim()) return false
  if (natureOfGoods === NATURE_OF_GOODS.LIVESTOCK) return true
  const normalized = natureOfGoods.toLowerCase()
  return FREIGHT_LIVESTOCK_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  )
}

export function packagesContainLivestock(
  packages: Array<{ natureOfGoods?: string | null }> | null | undefined,
): boolean {
  return (packages ?? []).some((pkg) => isLivestockNature(pkg.natureOfGoods))
}

export const FREIGHT_LIVESTOCK_CASH_MESSAGE =
  'Le transport de bêtes / animaux doit être payé cash avant expédition (PDA/ACC interdits). KAP FRET décline toute responsabilité en cas de mort des bêtes ; le client récupère les bêtes mortes et paie l\'intégralité du transport.'

/** Cash obligatoire si périssable (#8) ou bêtes (#12). */
export function packagesRequireCashBeforeShipment(
  packages: Array<{ natureOfGoods?: string | null }> | null | undefined,
): boolean {
  return packagesContainPerishable(packages) || packagesContainLivestock(packages)
}

export function getFreightCashRequirementMessage(
  packages: Array<{ natureOfGoods?: string | null }> | null | undefined,
): string | null {
  if (packagesContainLivestock(packages)) return FREIGHT_LIVESTOCK_CASH_MESSAGE
  if (packagesContainPerishable(packages)) return FREIGHT_PERISHABLE_CASH_MESSAGE
  return null
}

/** #10 — indemnisation max = kg × 1,5 USD. */
export function computeFreightLossClaimAmountUsd(lostWeightKg: string | number): number {
  const kg =
    typeof lostWeightKg === 'number'
      ? lostWeightKg
      : parseFloat(String(lostWeightKg).replace(',', '.')) || 0
  if (kg <= 0) return 0
  return Math.round(kg * FREIGHT_BUSINESS_RULES.lossRefundUsdPerKg * 100) / 100
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function parseArrivalDate(arrivedAt?: string | null): Date | null {
  if (!arrivedAt?.trim()) return null
  const date = new Date(arrivedAt)
  return Number.isNaN(date.getTime()) ? null : date
}

/** #1 — Échéance paiement = arrivée + N heures. */
export function getFreightPaymentDueAt(arrivedAt?: string | null): Date | null {
  const arrival = parseArrivalDate(arrivedAt)
  if (!arrival) return null
  return addHours(arrival, FREIGHT_BUSINESS_RULES.paymentDueHoursAfterArrival)
}

/** #3 — Délai enlèvement selon mode (cash origine 2 h, sinon PDA/ACC 48 h). */
export function getFreightPickupDueHours(paymentMode?: string | null): number {
  if (paymentMode === FREIGHT_PAYMENT_MODE.CASH) {
    return FREIGHT_BUSINESS_RULES.pickupHoursCashAtOrigin
  }
  return FREIGHT_BUSINESS_RULES.pickupHoursPda
}

export function getFreightPickupDueAt(
  arrivedAt?: string | null,
  paymentMode?: string | null,
): Date | null {
  const arrival = parseArrivalDate(arrivedAt)
  if (!arrival) return null
  return addHours(arrival, getFreightPickupDueHours(paymentMode))
}

type FreightDueInput = {
  status: FreightStatus | string
  arrivedAt?: string | null
  remainingAmount?: string | null
  paymentMode?: FreightPaymentMode | string | null
  ordinaryFreight?: string | null
  volumeFreight?: string | null
  totalAmount?: string | null
  /** Présents si l'API les renvoie (champs dérivés). */
  paymentDueAt?: string | null
  pickupDueAt?: string | null
  paymentOverdue?: boolean
  pickupOverdue?: boolean
  storageBillableDays?: number
  storageFees?: string | null
  liquidationDueAt?: string | null
  eligibleForLiquidation?: boolean
}

/** Statuts encore au dépôt destination. */
export function isFreightAwaitingPickup(status: string): boolean {
  return (
    status === FREIGHT_STATUS.ARRIVED
    || status === FREIGHT_STATUS.PENDING_LIQUIDATION
  )
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function calendarDaysBetween(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime()
  const b = startOfLocalDay(to).getTime()
  if (b <= a) return 0
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

/** Retard paiement : au dépôt + reste > 0 + maintenant > échéance. */
export function isFreightPaymentOverdue(
  shipment: FreightDueInput,
  now: Date = new Date(),
): boolean {
  if (shipment.paymentOverdue === true) return true
  if (shipment.paymentOverdue === false) return false
  if (!isFreightAwaitingPickup(shipment.status)) return false
  const remaining = parseFloat(String(shipment.remainingAmount ?? '').replace(',', '.')) || 0
  if (remaining <= 0.001) return false
  const due =
    shipment.paymentDueAt != null && shipment.paymentDueAt !== ''
      ? new Date(shipment.paymentDueAt)
      : getFreightPaymentDueAt(shipment.arrivedAt)
  if (!due || Number.isNaN(due.getTime())) return false
  return now.getTime() > due.getTime()
}

/** Retard enlèvement : au dépôt + maintenant > échéance enlèvement. */
export function isFreightPickupOverdue(
  shipment: FreightDueInput,
  now: Date = new Date(),
): boolean {
  if (shipment.pickupOverdue === true) return true
  if (shipment.pickupOverdue === false) return false
  if (!isFreightAwaitingPickup(shipment.status)) return false
  const due =
    shipment.pickupDueAt != null && shipment.pickupDueAt !== ''
      ? new Date(shipment.pickupDueAt)
      : getFreightPickupDueAt(shipment.arrivedAt, shipment.paymentMode)
  if (!due || Number.isNaN(due.getTime())) return false
  return now.getTime() > due.getTime()
}

export function getFreightTransportPriceForStorage(shipment: FreightDueInput): number {
  const ordinary = parseFloat(String(shipment.ordinaryFreight ?? '').replace(',', '.')) || 0
  const volume = parseFloat(String(shipment.volumeFreight ?? '').replace(',', '.')) || 0
  const sum = ordinary + volume
  if (sum > 0.001) return sum
  return parseFloat(String(shipment.totalAmount ?? '').replace(',', '.')) || 0
}

export function getFreightStorageBillableDays(
  shipment: FreightDueInput,
  now: Date = new Date(),
): number {
  if (typeof shipment.storageBillableDays === 'number') {
    return Math.max(0, shipment.storageBillableDays)
  }
  if (!isFreightAwaitingPickup(shipment.status)) return 0
  const arrival = parseArrivalDate(shipment.arrivedAt)
  if (!arrival) return 0
  const daysSince = calendarDaysBetween(arrival, now)
  return Math.max(0, daysSince - FREIGHT_BUSINESS_RULES.storageGraceDays)
}

/** #5 — frais = prix transport × 10 % × jours facturables. */
export function getFreightStorageFees(
  shipment: FreightDueInput,
  now: Date = new Date(),
): number {
  if (shipment.storageFees != null && shipment.storageFees !== '') {
    return parseFloat(String(shipment.storageFees).replace(',', '.')) || 0
  }
  const days = getFreightStorageBillableDays(shipment, now)
  if (days <= 0) return 0
  const base = getFreightTransportPriceForStorage(shipment)
  return Math.round(base * FREIGHT_BUSINESS_RULES.storageDailyRate * days * 100) / 100
}

export function getFreightLiquidationDueAt(arrivedAt?: string | null): Date | null {
  const arrival = parseArrivalDate(arrivedAt)
  if (!arrival) return null
  const start = startOfLocalDay(arrival)
  start.setDate(start.getDate() + FREIGHT_BUSINESS_RULES.liquidationDays)
  return start
}

export function isFreightEligibleForLiquidation(
  shipment: FreightDueInput,
  now: Date = new Date(),
): boolean {
  if (shipment.eligibleForLiquidation === true) return true
  if (shipment.eligibleForLiquidation === false) return false
  if (shipment.status !== FREIGHT_STATUS.ARRIVED) return false
  const due =
    shipment.liquidationDueAt != null && shipment.liquidationDueAt !== ''
      ? new Date(shipment.liquidationDueAt)
      : getFreightLiquidationDueAt(shipment.arrivedAt)
  if (!due || Number.isNaN(due.getTime())) return false
  return startOfLocalDay(now).getTime() >= startOfLocalDay(due).getTime()
}
