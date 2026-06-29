import { extractIri, extractResourceId } from '@/lib/hydra'
import { normalizeCurrency, CURRENCY, type Currency } from '@/constants/ticket'
import { FREIGHT_PAYMENT_MODE, FREIGHT_STATUS, FREIGHT_ORDINARY_PRICE_PER_KG_USD } from '@/constants/freight'
import { convertAmountBetweenCurrencyCodes } from '@/lib/exchange-rate'
import { getCheckpointDisplayName, getCheckpointLabelFromRef } from '@/lib/checkpoint'
import type {
  FreightPackage,
  FreightShipment,
  FreightShipmentCreatePayload,
  FreightShipmentPatchPayload,
  FreightPackagePatchPayload,
} from '@/types/freight-shipment'
import type {
  FreightShipmentFormData,
  FreightShipmentPatchFormData,
  FreightPackageFormData,
} from '@/schemas/freight.schema'
import type { IssuingOffice } from '@/types/issuing-office'
import type { Checkpoint } from '@/types/checkpoint'
import type { ExchangeRateResource } from '@/types/exchange-rate'

export function formatDecimal(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

/** Somme des poids totaux de tous les colis */
export function computeFreightPackagesTotalWeight(
  packages: { totalWeight?: string }[] | undefined,
): string {
  const sum = (packages ?? []).reduce<number>((acc, pkg) => {
    const weight = parseFloat(String(pkg.totalWeight ?? ''))
    return acc + (Number.isNaN(weight) ? 0 : weight)
  }, 0)
  return sum.toFixed(2)
}

/** Fret ordinaire = poids total × 3,5 USD/kg, converti selon la devise */
export function computeFreightOrdinaryAmount(
  totalWeightKg: string | number | undefined,
  currency: Currency = CURRENCY.USD,
  exchangeRates: ExchangeRateResource[] = [],
): string {
  const kg = parseFloat(String(totalWeightKg ?? '')) || 0
  if (kg <= 0) return '0.00'
  const usdAmount = kg * FREIGHT_ORDINARY_PRICE_PER_KG_USD
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

/** Montant total = fret ordinaire + fret volume + RVA + frais LTA */
export function computeFreightTotalAmount(
  ordinaryFreight: string | number | undefined,
  volumeFreight: string | number | undefined,
  rva: string | number | undefined,
  ltaFees: string | number | undefined,
): string {
  const sum = [ordinaryFreight, volumeFreight, rva, ltaFees].reduce<number>((acc, value) => {
    const num = parseFloat(String(value ?? ''))
    return acc + (Number.isNaN(num) ? 0 : num)
  }, 0)
  return sum.toFixed(2)
}

/** En mode acompte, le montant payé ne peut pas dépasser le total */
export function clampFreightPartialPaidAmount(
  paidAmount: string | number | undefined,
  totalAmount: string | number | undefined,
): string {
  const total = parseFloat(String(totalAmount ?? '')) || 0
  const paid = parseFloat(String(paidAmount ?? '')) || 0
  return Math.min(paid, total).toFixed(2)
}

/** Reste à payer = montant total − montant payé */
export function computeFreightRemainingAmount(
  totalAmount: string | number | undefined,
  paidAmount: string | number | undefined,
): string {
  const total = parseFloat(String(totalAmount ?? '')) || 0
  const paid = parseFloat(String(paidAmount ?? '')) || 0
  return Math.max(0, total - paid).toFixed(2)
}

export function toShipmentDateIso(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return `${date}T${normalizedTime}Z`
}

export function parseShipmentDate(isoDate: string): { date: string; time: string } {
  const [datePart, timePart] = isoDate.split('T')
  const time = timePart?.slice(0, 5) ?? '00:00'
  return { date: datePart ?? isoDate, time }
}

export function toFreightCreatePayload(data: FreightShipmentFormData): FreightShipmentCreatePayload {
  const payload: FreightShipmentCreatePayload = {
    ltaNumber: data.ltaNumber,
    shipmentDate: toShipmentDateIso(data.shipmentDate, data.shipmentTime),
    airline: data.airline,
    aircraft: data.aircraft,
    registration: data.registration,
    loadingPlace: data.loadingPlace,
    unloadingPlace: data.unloadingPlace,
    senderName: data.senderName,
    senderAddress: data.senderAddress,
    senderPhone: data.senderPhone,
    receiverName: data.receiverName,
    receiverAddress: data.receiverAddress,
    receiverPhone: data.receiverPhone,
    packageCount: data.packageCount,
    totalWeight: formatDecimal(data.totalWeight),
    ordinaryFreight: formatDecimal(data.ordinaryFreight),
    volumeFreight: formatDecimal(data.volumeFreight),
    rva: formatDecimal(data.rva),
    ltaFees: formatDecimal(data.ltaFees),
    totalAmount: formatDecimal(data.totalAmount),
    currency: normalizeCurrency(data.currency),
    paidAmount: formatDecimal(data.paidAmount),
    remainingAmount: formatDecimal(data.remainingAmount),
    paymentMode: data.paymentMode,
    observations: data.observations?.trim() ?? '',
    packages: data.packages.map((pkg) => ({
      packageNumber: pkg.packageNumber,
      packagingType: pkg.packagingType,
      natureOfGoods: pkg.natureOfGoods,
      unitWeight: formatDecimal(pkg.unitWeight),
      totalWeight: formatDecimal(pkg.totalWeight),
    })),
  }

  if (
    (data.paymentMode === FREIGHT_PAYMENT_MODE.CASH || data.paymentMode === FREIGHT_PAYMENT_MODE.PARTIAL)
    && data.cashRegister?.trim()
  ) {
    payload.cashRegister = data.cashRegister
  }

  return payload
}

export function toFreightPatchPayload(data: FreightShipmentPatchFormData): FreightShipmentPatchPayload {
  return {
    ltaNumber: data.ltaNumber,
    shipmentDate: toShipmentDateIso(data.shipmentDate, data.shipmentTime),
    airline: data.airline,
    aircraft: data.aircraft,
    registration: data.registration,
    loadingPlace: data.loadingPlace,
    unloadingPlace: data.unloadingPlace,
    senderName: data.senderName,
    senderAddress: data.senderAddress,
    senderPhone: data.senderPhone,
    receiverName: data.receiverName,
    receiverAddress: data.receiverAddress,
    receiverPhone: data.receiverPhone,
    packageCount: data.packageCount,
    totalWeight: formatDecimal(data.totalWeight),
    ordinaryFreight: formatDecimal(data.ordinaryFreight),
    volumeFreight: formatDecimal(data.volumeFreight),
    rva: formatDecimal(data.rva),
    ltaFees: formatDecimal(data.ltaFees),
    totalAmount: formatDecimal(data.totalAmount),
    currency: normalizeCurrency(data.currency),
    paidAmount: formatDecimal(data.paidAmount),
    remainingAmount: formatDecimal(data.remainingAmount),
    paymentMode: data.paymentMode,
    observations: data.observations?.trim() ?? '',
  }
}

export function toFreightPackagePatchPayload(data: FreightPackageFormData): FreightPackagePatchPayload {
  return {
    packageNumber: data.packageNumber,
    packagingType: data.packagingType,
    natureOfGoods: data.natureOfGoods,
    unitWeight: formatDecimal(data.unitWeight),
    totalWeight: formatDecimal(data.totalWeight),
  }
}

export function shipmentToFormDefaults(shipment: FreightShipment): Partial<FreightShipmentFormData> {
  const { date, time } = parseShipmentDate(shipment.shipmentDate)
  return {
    ltaNumber: shipment.ltaNumber,
    shipmentDate: date,
    shipmentTime: time,
    airline: shipment.airline,
    aircraft: shipment.aircraft,
    registration: shipment.registration,
    loadingPlace: extractIri(shipment.loadingPlace) ?? '',
    unloadingPlace: extractIri(shipment.unloadingPlace) ?? '',
    senderName: shipment.senderName,
    senderAddress: shipment.senderAddress,
    senderPhone: shipment.senderPhone,
    receiverName: shipment.receiverName,
    receiverAddress: shipment.receiverAddress,
    receiverPhone: shipment.receiverPhone,
    packageCount: shipment.packageCount,
    totalWeight: shipment.totalWeight,
    ordinaryFreight: shipment.ordinaryFreight,
    volumeFreight: shipment.volumeFreight,
    rva: shipment.rva,
    ltaFees: shipment.ltaFees,
    totalAmount: shipment.totalAmount,
    paidAmount: shipment.paidAmount,
    remainingAmount: shipment.remainingAmount,
    paymentMode: shipment.paymentMode,
    observations: shipment.observations ?? '',
    packages: (shipment.packages ?? []).map(packageToFormDefaults),
  }
}

export function shipmentToPatchFormDefaults(shipment: FreightShipment): Partial<FreightShipmentPatchFormData> {
  const { date, time } = parseShipmentDate(shipment.shipmentDate)
  return {
    ltaNumber: shipment.ltaNumber,
    shipmentDate: date,
    shipmentTime: time,
    airline: shipment.airline,
    aircraft: shipment.aircraft,
    registration: shipment.registration,
    loadingPlace: extractIri(shipment.loadingPlace) ?? '',
    unloadingPlace: extractIri(shipment.unloadingPlace) ?? '',
    senderName: shipment.senderName,
    senderAddress: shipment.senderAddress,
    senderPhone: shipment.senderPhone,
    receiverName: shipment.receiverName,
    receiverAddress: shipment.receiverAddress,
    receiverPhone: shipment.receiverPhone,
    packageCount: shipment.packageCount,
    totalWeight: shipment.totalWeight,
    ordinaryFreight: shipment.ordinaryFreight,
    volumeFreight: shipment.volumeFreight,
    rva: shipment.rva,
    ltaFees: shipment.ltaFees,
    totalAmount: shipment.totalAmount,
    currency: normalizeCurrency(shipment.currency),
    paidAmount: shipment.paidAmount,
    remainingAmount: shipment.remainingAmount,
    paymentMode: shipment.paymentMode,
    observations: shipment.observations ?? '',
  }
}

export function packageToFormDefaults(pkg: FreightPackage): FreightPackageFormData {
  return {
    packageNumber: pkg.packageNumber,
    packagingType: pkg.packagingType,
    natureOfGoods: pkg.natureOfGoods,
    unitWeight: pkg.unitWeight,
    totalWeight: pkg.totalWeight,
  }
}

export function getFreightIssuingOfficeLabel(shipment: FreightShipment): string {
  const office = shipment.issuingOffice
  if (!office) return '—'
  if (typeof office === 'object') return (office as IssuingOffice).name
  return office
}

export function getFreightCheckpointIri(checkpoint: string | Checkpoint): string {
  return extractIri(checkpoint) ?? (typeof checkpoint === 'string' ? checkpoint : checkpoint['@id'])
}

export function formatFreightCheckpointLabel(cp: string | Checkpoint | undefined | null): string {
  if (!cp) return '—'

  const embedded = getCheckpointLabelFromRef(typeof cp === 'object' ? cp : undefined)
  if (embedded) return embedded

  if (typeof cp === 'object') {
    return cp.id ?? extractResourceId(cp['@id']) ?? '—'
  }

  const label = getCheckpointDisplayName(cp)
  if (label.startsWith('/api/')) {
    return extractResourceId(label) ?? label
  }
  return label
}

export function formatFreightWeight(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isNaN(num)) return '0,00 kg'
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
}

export function hasFreightObservations(obs?: string | null): boolean {
  if (!obs) return false
  const trimmed = obs.trim()
  return trimmed !== '' && trimmed !== '-'
}

export function getFreightCurrency(shipment: FreightShipment): Currency {
  return normalizeCurrency(shipment.currency)
}

/** Encaissement du solde requis avant passage au statut Livré (acompte ou à l'arrivée). */
export function shouldCollectFreightRemainingOnDelivery(shipment: FreightShipment): boolean {
  const remaining = parseFloat(shipment.remainingAmount) || 0
  if (remaining <= 0) return false
  return (
    shipment.paymentMode === FREIGHT_PAYMENT_MODE.PARTIAL
    || shipment.paymentMode === FREIGHT_PAYMENT_MODE.AT_ARRIVAL
  )
}

export function getFreightDeliveryPaymentAmount(shipment: FreightShipment): string {
  return formatDecimal(shipment.remainingAmount)
}

export function buildFreightDeliveryPaymentDescription(shipment: FreightShipment): string {
  return `Fret ${shipment.ltaNumber} — solde à la livraison`
}

/** N° expéditeur affiché sur le manifeste (téléphone ou identifiant) */
export function getFreightSenderNumber(shipment: FreightShipment): string {
  const phone = shipment.senderPhone?.trim()
  if (phone) return phone
  const name = shipment.senderName?.trim()
  if (name) return name
  return shipment.id ?? '—'
}

export function filterFreightShipmentsForManifest(shipments: FreightShipment[]): FreightShipment[] {
  return shipments.filter((shipment) => shipment.status !== FREIGHT_STATUS.CANCELLED)
}

export function sortFreightShipmentsForManifest(shipments: FreightShipment[]): FreightShipment[] {
  const currencyOrder: Currency[] = [CURRENCY.USD, CURRENCY.CDF]
  const currencyRank = (currency: Currency) => {
    const index = currencyOrder.indexOf(currency)
    return index === -1 ? currencyOrder.length : index
  }

  return [...shipments].sort((a, b) => {
    const currencyCompare =
      currencyRank(getFreightCurrency(a)) - currencyRank(getFreightCurrency(b))
    if (currencyCompare !== 0) return currencyCompare
    return (a.receiverName ?? '').localeCompare(b.receiverName ?? '', 'fr')
  })
}

function parseFreightSortTimestamp(value: string | undefined): number {
  if (!value?.trim()) return 0
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? 0 : ts
}

function compareFreightIds(a: string | number | undefined, b: string | number | undefined): number {
  const idA = String(a ?? '')
  const idB = String(b ?? '')
  const numA = Number(idA)
  const numB = Number(idB)
  if (idA !== '' && idB !== '' && !Number.isNaN(numA) && !Number.isNaN(numB) && numB !== numA) {
    return numB - numA
  }
  return idB.localeCompare(idA, undefined, { numeric: true })
}

function getFreightSortTimestamp(shipment: FreightShipment): number {
  for (const value of [shipment.createdAt, shipment.shipmentDate, shipment.updatedAt]) {
    const timestamp = parseFreightSortTimestamp(value)
    if (timestamp > 0) return timestamp
  }
  return 0
}

/** Expéditions les plus récentes en premier */
export function sortFreightShipmentsByNewestFirst(shipments: FreightShipment[]): FreightShipment[] {
  return [...shipments].sort((a, b) => {
    const timeA = getFreightSortTimestamp(a)
    const timeB = getFreightSortTimestamp(b)
    if (timeB !== timeA) return timeB - timeA
    return compareFreightIds(a.id, b.id)
  })
}
