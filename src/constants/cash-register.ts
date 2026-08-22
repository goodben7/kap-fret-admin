export const CASH_REGISTER_MODULE = {
  TICKETING: 'TICKETING',
  FREIGHT: 'FREIGHT',
  GENERAL: 'GENERAL',
} as const

export type CashRegisterModule = (typeof CASH_REGISTER_MODULE)[keyof typeof CASH_REGISTER_MODULE]

export const CASH_REGISTER_MODULE_LABELS: Record<CashRegisterModule, string> = {
  TICKETING: 'Billetterie',
  FREIGHT: 'Fret',
  GENERAL: 'Général',
}

export const CASH_REGISTER_MODULE_OPTIONS = (
  Object.entries(CASH_REGISTER_MODULE_LABELS) as [CashRegisterModule, string][]
).map(([value, label]) => ({ value, label }))
