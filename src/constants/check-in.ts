export const CHECK_IN_STATUS = {
  CREATED: 'CREATED',
  CANCELLED: 'CANCELLED',
} as const

export type CheckInStatus = (typeof CHECK_IN_STATUS)[keyof typeof CHECK_IN_STATUS]

export const CHECK_IN_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Créé',
  CANCELLED: 'Annulé',
}

/** Tarif excédent bagage : 5 USD par kg */
export const CHECK_IN_EXCESS_PRICE_PER_KG_USD = 5
