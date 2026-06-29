export const FREIGHT_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  ARRIVED: 'ARRIVED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const

export type FreightStatus = (typeof FREIGHT_STATUS)[keyof typeof FREIGHT_STATUS]

export const FREIGHT_STATUS_LABELS: Record<FreightStatus, string> = {
  PENDING: 'En attente',
  SENT: 'Expédié',
  ARRIVED: 'Arrivé',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
}

export function freightStatusBadgeVariant(status: FreightStatus): 'default' | 'secondary' | 'success' | 'destructive' {
  if (status === FREIGHT_STATUS.DELIVERED) return 'success'
  if (status === FREIGHT_STATUS.ARRIVED) return 'secondary'
  if (status === FREIGHT_STATUS.CANCELLED) return 'destructive'
  return 'default'
}

/** Couleur du select « Nouveau statut » selon la valeur choisie */
export function freightStatusSelectClass(status: FreightStatus | string): string {
  switch (status) {
    case FREIGHT_STATUS.PENDING:
    case FREIGHT_STATUS.SENT:
      return 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
    case FREIGHT_STATUS.ARRIVED:
      return 'border-border bg-secondary/90 text-secondary-foreground hover:bg-secondary'
    case FREIGHT_STATUS.DELIVERED:
      return 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200/80'
    case FREIGHT_STATUS.CANCELLED:
      return 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15'
    default:
      return ''
  }
}

export const FREIGHT_STATUS_OPTIONS: { value: FreightStatus; label: string }[] = (
  Object.entries(FREIGHT_STATUS_LABELS) as [FreightStatus, string][]
).map(([value, label]) => ({ value, label }))

export function freightStatusFilterOptions(allLabel = 'Tous les statuts') {
  return [{ value: '', label: allLabel }, ...FREIGHT_STATUS_OPTIONS]
}

/** Statuts modifiables via POST /status */
export const FREIGHT_STATUS_TRANSITIONS = [
  FREIGHT_STATUS.SENT,
  FREIGHT_STATUS.ARRIVED,
  FREIGHT_STATUS.DELIVERED,
  FREIGHT_STATUS.CANCELLED,
] as const

export const FREIGHT_PAYMENT_MODE = {
  CASH: 'CASH',
  PARTIAL: 'PARTIAL',
  AT_ARRIVAL: 'AT_ARRIVAL',
} as const

export type FreightPaymentMode = (typeof FREIGHT_PAYMENT_MODE)[keyof typeof FREIGHT_PAYMENT_MODE]

export const FREIGHT_PAYMENT_MODE_LABELS: Record<FreightPaymentMode, string> = {
  CASH: 'Comptant',
  PARTIAL: 'Acompte',
  AT_ARRIVAL: 'À l\'arrivée',
}

export const FREIGHT_PAYMENT_MODE_OPTIONS: { value: FreightPaymentMode; label: string }[] = (
  Object.entries(FREIGHT_PAYMENT_MODE_LABELS) as [FreightPaymentMode, string][]
).map(([value, label]) => ({ value, label }))

export function freightPaymentModeFilterOptions(allLabel = 'Tous les modes') {
  return [{ value: '', label: allLabel }, ...FREIGHT_PAYMENT_MODE_OPTIONS]
}

/** Tarif fret ordinaire : 3,5 USD par kg */
export const FREIGHT_ORDINARY_PRICE_PER_KG_USD = 3.5

export const PACKAGING_TYPE = {
  BOX: 'BOX',
  CARTON: 'CARTON',
  PALLET: 'PALLET',
  BAG: 'BAG',
  CRATE: 'CRATE',
  ENVELOPE: 'ENVELOPE',
  OTHER: 'OTHER',
} as const

export type PackagingType = (typeof PACKAGING_TYPE)[keyof typeof PACKAGING_TYPE]

export const PACKAGING_TYPE_LABELS: Record<PackagingType, string> = {
  BOX: 'Boîte',
  CARTON: 'Carton',
  PALLET: 'Palette',
  BAG: 'Sac',
  CRATE: 'Caisse',
  ENVELOPE: 'Enveloppe',
  OTHER: 'Autre',
}

/** @deprecated use PACKAGING_TYPE */
export const PACKAGE_TYPE = PACKAGING_TYPE
/** @deprecated use PackagingType */
export type PackageType = PackagingType
/** @deprecated use PACKAGING_TYPE_LABELS */
export const PACKAGE_TYPE_LABELS = PACKAGING_TYPE_LABELS

export const NATURE_OF_GOODS = {
  GENERAL_CARGO: 'GENERAL_CARGO',
  PERISHABLE: 'PERISHABLE',
  DANGEROUS_GOODS: 'DANGEROUS_GOODS',
  FRAGILE: 'FRAGILE',
  VALUABLES: 'VALUABLES',
  PHARMACEUTICALS: 'PHARMACEUTICALS',
  OTHER: 'OTHER',
} as const

export type NatureOfGoods = (typeof NATURE_OF_GOODS)[keyof typeof NATURE_OF_GOODS]

export const NATURE_OF_GOODS_LABELS: Record<NatureOfGoods, string> = {
  GENERAL_CARGO: 'Marchandise générale',
  PERISHABLE: 'Périssable',
  DANGEROUS_GOODS: 'Matières dangereuses',
  FRAGILE: 'Fragile',
  VALUABLES: 'Objets de valeur',
  PHARMACEUTICALS: 'Pharmaceutiques',
  OTHER: 'Autre',
}
