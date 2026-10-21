export const CHECK_IN_STATUS = {
  CREATED: 'CREATED',
  CANCELLED: 'CANCELLED',
} as const

export type CheckInStatus = (typeof CHECK_IN_STATUS)[keyof typeof CHECK_IN_STATUS]

export const CHECK_IN_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Créé',
  CANCELLED: 'Annulé',
}

/** Modes de paiement excédent bagage — alignés sur CheckIn::getPaymentModes() */
export const CHECK_IN_PAYMENT_MODE = {
  CASH: 'CASH',
  ACC: 'ACC',
  PTA: 'PTA',
} as const

export type CheckInPaymentMode =
  (typeof CHECK_IN_PAYMENT_MODE)[keyof typeof CHECK_IN_PAYMENT_MODE]

export const CHECK_IN_PAYMENT_MODE_LABELS: Record<CheckInPaymentMode, string> = {
  CASH: 'Cash (total)',
  ACC: 'Acompte (ACC)',
  PTA: 'Payer à destination (PTA)',
}

/** Tarif excédent bagage : 5 USD par kg */
export const CHECK_IN_EXCESS_PRICE_PER_KG_USD = 5
