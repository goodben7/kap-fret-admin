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

/** Workflow de validation (API `status`) */
export const CASH_TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED',
} as const

export type CashTransactionStatus =
  (typeof CASH_TRANSACTION_STATUS)[keyof typeof CASH_TRANSACTION_STATUS]

export const CASH_TRANSACTION_STATUS_LABELS: Record<CashTransactionStatus, string> = {
  PENDING: 'En attente',
  IN_REVIEW: 'En examen',
  VALIDATED: 'Validée',
  REJECTED: 'Rejetée',
}

export const CASH_TRANSACTION_STATUS_OPTIONS = Object.entries(CASH_TRANSACTION_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
)
