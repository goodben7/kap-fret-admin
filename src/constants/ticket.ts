export const TICKET_STATUS = {
  RESERVED: 'RESERVED',
  ISSUED: 'ISSUED',
  USED: 'USED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS]

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  RESERVED: 'Réservé',
  ISSUED: 'Émis',
  USED: 'Utilisé',
  CANCELLED: 'Annulé',
  REFUNDED: 'Remboursé',
}

export const PAYMENT_MODE = {
  CASH: 'CASH',
  CARD: 'CARD',
  MOBILE_MONEY: 'MOBILE_MONEY',
  SPONSOR: 'SPONSOR',
} as const

export type PaymentMode = (typeof PAYMENT_MODE)[keyof typeof PAYMENT_MODE]

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  MOBILE_MONEY: 'Mobile Money',
  SPONSOR: 'Sponsor',
}

/** Ordre stable pour selects / filtres — aligné sur Ticket::PAYMENT_MODE_* côté API */
export const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  PAYMENT_MODE.CASH,
  PAYMENT_MODE.CARD,
  PAYMENT_MODE.MOBILE_MONEY,
  PAYMENT_MODE.SPONSOR,
].map((value) => ({ value, label: PAYMENT_MODE_LABELS[value] }))

export function paymentModeFilterOptions(allLabel = 'Tous les modes') {
  return [{ value: '', label: allLabel }, ...PAYMENT_MODE_OPTIONS]
}

export const CURRENCY = {
  CDF: 'CDF',
  USD: 'USD',
} as const

export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY]

export const CURRENCY_LABELS: Record<Currency, string> = {
  CDF: 'Franc congolais (CDF)',
  USD: 'Dollar US (USD)',
}

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  CURRENCY.CDF,
  CURRENCY.USD,
].map((value) => ({ value, label: CURRENCY_LABELS[value] }))

export function currencyFilterOptions(allLabel = 'Toutes les devises') {
  return [{ value: '', label: allLabel }, ...CURRENCY_OPTIONS]
}

/** Valeur URL / filtre → CDF | USD, ou vide si invalide */
export function parseCurrencyFilter(value: string): '' | Currency {
  const code = value.trim().toUpperCase()
  if (code === CURRENCY.CDF || code === CURRENCY.USD) return code
  return ''
}

/** Valeur API / legacy → code ISO supporté (évite le crash Intl sur "" ou valeur inconnue) */
export function normalizeCurrency(value: unknown): Currency {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (code === CURRENCY.CDF || code === CURRENCY.USD) return code
  return CURRENCY.USD
}

export const GENDER = {
  MALE: 'M',
  FEMALE: 'F',
} as const

export type Gender = (typeof GENDER)[keyof typeof GENDER]

export const GENDER_LABELS: Record<Gender, string> = {
  M: 'Homme',
  F: 'Femme',
}
