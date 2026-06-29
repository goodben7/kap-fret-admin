export const CASH_TRANSACTION_TYPE = {
  ENTRY: 'ENTRY',
  EXIT: 'EXIT',
} as const

export type CashTransactionType = (typeof CASH_TRANSACTION_TYPE)[keyof typeof CASH_TRANSACTION_TYPE]

export const CASH_TRANSACTION_TYPE_LABELS: Record<CashTransactionType, string> = {
  ENTRY: 'Entrée',
  EXIT: 'Sortie',
}

export const CASH_TRANSACTION_REFERENCE_TYPE = {
  TICKET: 'TICKET',
  FREIGHT: 'FREIGHT',
  CHECKIN: 'CHECKIN',
  MANUAL: 'MANUAL',
} as const

export type CashTransactionReferenceType =
  (typeof CASH_TRANSACTION_REFERENCE_TYPE)[keyof typeof CASH_TRANSACTION_REFERENCE_TYPE]
  | string

export const CASH_TRANSACTION_REFERENCE_TYPE_LABELS: Record<string, string> = {
  TICKET: 'Billet',
  FREIGHT: 'Fret',
  CHECKIN: 'Check-in',
  MANUAL: 'Manuel',
}

export const CASH_TRANSACTION_TYPE_OPTIONS = Object.entries(CASH_TRANSACTION_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export const CASH_TRANSACTION_REFERENCE_TYPE_OPTIONS = Object.entries(
  CASH_TRANSACTION_REFERENCE_TYPE_LABELS,
).map(([value, label]) => ({ value, label }))
