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
  PDA: 'PDA',
  /** @deprecated legacy API value — traiter comme PDA */
  PTA: 'PTA',
} as const

export type CheckInPaymentMode =
  (typeof CHECK_IN_PAYMENT_MODE)[keyof typeof CHECK_IN_PAYMENT_MODE]

export const CHECK_IN_PAYMENT_MODE_LABELS: Record<CheckInPaymentMode, string> = {
  CASH: 'Cash (total)',
  ACC: 'Acompte (ACC)',
  PDA: 'Payer à destination (PDA)',
  PTA: 'Payer à destination (PDA)',
}

/** True si mode payer-à-destination (PDA ou ancien PTA). */
export function isCheckInPayAtDestination(mode: string | undefined | null): boolean {
  return mode === CHECK_IN_PAYMENT_MODE.PDA || mode === CHECK_IN_PAYMENT_MODE.PTA
}

/** Modes proposés à la création (sans alias legacy PTA). */
export const CHECK_IN_PAYMENT_MODE_OPTIONS: { value: CheckInPaymentMode; label: string }[] = [
  CHECK_IN_PAYMENT_MODE.CASH,
  CHECK_IN_PAYMENT_MODE.ACC,
  CHECK_IN_PAYMENT_MODE.PDA,
].map((value) => ({ value, label: CHECK_IN_PAYMENT_MODE_LABELS[value] }))

/** Tarif excédent bagage : 5 USD par kg */
export const CHECK_IN_EXCESS_PRICE_PER_KG_USD = 5
