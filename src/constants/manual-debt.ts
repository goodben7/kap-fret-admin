export const MANUAL_DEBT_STATUS = {
  OPEN: 'OPEN',
  PARTIAL: 'PARTIAL',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED',
} as const

export type ManualDebtStatus = (typeof MANUAL_DEBT_STATUS)[keyof typeof MANUAL_DEBT_STATUS]

export const MANUAL_DEBT_STATUS_LABELS: Record<ManualDebtStatus, string> = {
  OPEN: 'Ouverte',
  PARTIAL: 'Partielle',
  SETTLED: 'Soldée',
  CANCELLED: 'Annulée',
}

export const MANUAL_DEBT_CURRENCY = {
  USD: 'USD',
  CDF: 'CDF',
} as const

export type ManualDebtCurrency = (typeof MANUAL_DEBT_CURRENCY)[keyof typeof MANUAL_DEBT_CURRENCY]

export const MANUAL_DEBT_CURRENCY_OPTIONS = [
  { value: MANUAL_DEBT_CURRENCY.USD, label: 'USD' },
  { value: MANUAL_DEBT_CURRENCY.CDF, label: 'CDF' },
]
