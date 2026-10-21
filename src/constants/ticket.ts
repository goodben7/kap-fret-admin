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
  ACC: 'ACC',
  PDA: 'PDA',
  /** @deprecated legacy — traiter comme PDA */
  PTA: 'PTA',
  /** Legacy — billets existants uniquement */
  CARD: 'CARD',
  MOBILE_MONEY: 'MOBILE_MONEY',
  SPONSOR: 'SPONSOR',
} as const

export type PaymentMode = (typeof PAYMENT_MODE)[keyof typeof PAYMENT_MODE]

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: 'Cash',
  ACC: 'ACC',
  PDA: 'PDA',
  PTA: 'PDA',
  CARD: 'Carte bancaire',
  MOBILE_MONEY: 'Mobile Money',
  SPONSOR: 'Sponsor',
}

/** True si mode payer-à-destination (PDA ou ancien PTA). */
export function isPayAtDestination(mode: string | undefined | null): boolean {
  return mode === PAYMENT_MODE.PDA || mode === PAYMENT_MODE.PTA
}

/** Modes formulaires / création (sans alias legacy PTA). */
export type FormPaymentMode =
  | typeof PAYMENT_MODE.CASH
  | typeof PAYMENT_MODE.ACC
  | typeof PAYMENT_MODE.PDA

/** PTA legacy → PDA pour les formulaires. */
export function toFormPaymentMode(mode: string | null | undefined): FormPaymentMode {
  if (mode === PAYMENT_MODE.ACC) return PAYMENT_MODE.ACC
  if (isPayAtDestination(mode)) return PAYMENT_MODE.PDA
  return PAYMENT_MODE.CASH
}

/** Modes proposés à la création / filtres — alignés sur Ticket::getPaymentModes() */
export const PAYMENT_MODE_OPTIONS: { value: FormPaymentMode; label: string }[] = [
  PAYMENT_MODE.CASH,
  PAYMENT_MODE.ACC,
  PAYMENT_MODE.PDA,
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

/** Catégories passager — alignées sur Ticket::CATEGORY_* côté API */
export const TICKET_CATEGORY = {
  INF: 'INF',
  CD: 'CD',
  AD: 'AD',
} as const

export type TicketCategory = (typeof TICKET_CATEGORY)[keyof typeof TICKET_CATEGORY]

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  INF: 'Nourrisson (0-2 ans)',
  CD: 'Enfant (3-10 ans)',
  AD: 'Adulte (11 ans et +)',
}

export const TICKET_CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  TICKET_CATEGORY.INF,
  TICKET_CATEGORY.CD,
  TICKET_CATEGORY.AD,
].map((value) => ({ value, label: TICKET_CATEGORY_LABELS[value] }))

/** Prix de base par défaut (USD) selon la catégorie */
export const TICKET_CATEGORY_BASE_PRICE_USD: Record<TicketCategory, string> = {
  INF: '100.00',
  CD: '200.00',
  AD: '320.00',
}

/** Plages d'âge indicatives par catégorie */
export const TICKET_CATEGORY_AGE_RANGE: Record<TicketCategory, { min: number; max: number }> = {
  INF: { min: 0, max: 2 },
  CD: { min: 3, max: 10 },
  AD: { min: 11, max: 120 },
}
