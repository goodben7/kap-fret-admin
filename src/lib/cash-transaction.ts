import type { CashTransactionCurrencyRef, CashTransactionCashRegisterRef, CashTransactionIssuingOfficeRef } from '@/types/cash-transaction'
import {
  CASH_TRANSACTION_REFERENCE_TYPE,
  CASH_TRANSACTION_REFERENCE_TYPE_LABELS,
  CASH_TRANSACTION_TYPE,
  CASH_TRANSACTION_TYPE_LABELS,
  type CashTransactionReferenceType,
  type CashTransactionType,
} from '@/constants/cash-transaction'
import { CURRENCY } from '@/constants/ticket'
import { extractIri } from '@/lib/hydra'
import type { CashTransactionCreateFormData } from '@/schemas/cash-transaction.schema'
import type { CashTransaction, CashTransactionCreatePayload } from '@/types/cash-transaction'

export function getCashTransactionCurrencyCode(
  currency: string | CashTransactionCurrencyRef | undefined,
): string | null {
  if (!currency || typeof currency === 'string') return null
  return currency.code ?? null
}

export function getCashTransactionCashRegisterRef(
  cashRegister: string | CashTransactionCashRegisterRef | undefined,
): CashTransactionCashRegisterRef | null {
  if (!cashRegister || typeof cashRegister === 'string') return null
  return cashRegister
}

export function getCashTransactionCashRegisterLabel(
  cashRegister: string | CashTransactionCashRegisterRef | undefined,
): string {
  const ref = getCashTransactionCashRegisterRef(cashRegister)
  if (ref?.code && ref?.name) return `${ref.code} — ${ref.name}`
  if (ref?.name) return ref.name
  if (typeof cashRegister === 'string') return cashRegister
  return '—'
}

export function getCashTransactionCashRegisterIri(
  cashRegister: string | CashTransactionCashRegisterRef | undefined,
): string {
  return extractIri(cashRegister) ?? (typeof cashRegister === 'string' ? cashRegister : '')
}

export function getCashTransactionIssuingOfficeLabel(
  issuingOffice: string | CashTransactionIssuingOfficeRef | undefined,
): string {
  if (!issuingOffice) return '—'
  if (typeof issuingOffice === 'object') return issuingOffice.name ?? issuingOffice.code ?? issuingOffice.id
  return issuingOffice
}

export function toTransactionDateIso(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return `${date}T${normalizedTime}Z`
}

export function parseTransactionDate(isoDate: string): string {
  return isoDate.split('T')[0] ?? isoDate
}

export function parseTransactionTime(isoDate: string, fallback = '00:00'): string {
  const match = isoDate.match(/T(\d{2}:\d{2})/)
  return match?.[1] ?? fallback
}

export function toCashTransactionCreatePayload(
  data: CashTransactionCreateFormData,
): CashTransactionCreatePayload {
  return {
    cashRegister: data.cashRegister,
    type: data.type,
    amount: data.amount,
    currency: data.currency,
    description: data.description.trim(),
    referenceType: data.referenceType,
    referenceId:
      data.referenceType === CASH_TRANSACTION_REFERENCE_TYPE.MANUAL
        ? (data.referenceId?.trim() ?? '')
        : (data.referenceId?.trim() ?? ''),
    transactionDate: toTransactionDateIso(data.transactionDate, data.transactionTime),
    validated: data.validated,
  }
}

export function getCashTransactionTypeLabel(type: CashTransactionType): string {
  return CASH_TRANSACTION_TYPE_LABELS[type] ?? type
}

export function getCashTransactionReferenceTypeLabel(referenceType: CashTransactionReferenceType): string {
  return CASH_TRANSACTION_REFERENCE_TYPE_LABELS[referenceType] ?? referenceType
}

export function cashTransactionReferencePath(
  referenceType: CashTransactionReferenceType,
  referenceId: string,
): string | null {
  switch (referenceType) {
    case 'TICKET':
      return `/tickets/${referenceId}`
    case 'FREIGHT':
      return `/freight/${referenceId}`
    case 'CHECKIN':
      return `/checkins/${referenceId}`
    default:
      return null
  }
}

function parseSortTimestamp(value: string | undefined): number {
  if (!value?.trim()) return 0
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? 0 : ts
}

function compareCashTransactionIds(
  a: string | number | undefined,
  b: string | number | undefined,
): number {
  const idA = String(a ?? '')
  const idB = String(b ?? '')
  const numA = Number(idA)
  const numB = Number(idB)
  if (idA !== '' && idB !== '' && !Number.isNaN(numA) && !Number.isNaN(numB) && numB !== numA) {
    return numB - numA
  }
  return idB.localeCompare(idA, undefined, { numeric: true })
}

function getCashTransactionSortTimestamp(item: {
  createdAt?: string
  transactionDate?: string
}): number {
  for (const value of [item.createdAt, item.transactionDate]) {
    const timestamp = parseSortTimestamp(value)
    if (timestamp > 0) return timestamp
  }
  return 0
}

/** Transactions les plus récentes en premier */
export function sortCashTransactionsByNewestFirst<
  T extends { createdAt?: string; transactionDate?: string; id?: string | number },
>(transactions: T[]): T[] {
  return [...transactions].sort((a, b) => {
    const timeA = getCashTransactionSortTimestamp(a)
    const timeB = getCashTransactionSortTimestamp(b)
    if (timeB !== timeA) return timeB - timeA
    return compareCashTransactionIds(a.id, b.id)
  })
}

/** Transactions les plus anciennes en premier (rapport de caisse chronologique) */
export function sortCashTransactionsByOldestFirst<
  T extends { createdAt?: string; transactionDate?: string; id?: string | number },
>(transactions: T[]): T[] {
  return sortCashTransactionsByNewestFirst(transactions).reverse()
}

export interface CashReportCurrencySplit {
  usd: number
  cdf: number
}

function applyCashReportAmount(
  target: CashReportCurrencySplit,
  code: string | null | undefined,
  value: number,
) {
  if (!code || !Number.isFinite(value) || value === 0) return
  if (code === CURRENCY.USD) target.usd += value
  else if (code === CURRENCY.CDF) target.cdf += value
}

/**
 * Répartit une transaction caisse en colonnes USD / CDF pour le rapport.
 * Une opération n'apparaît que dans sa devise d'encaissement (pas de conversion croisée).
 */
export function splitCashTransactionForReport(
  transaction: Pick<
    CashTransaction,
    'type' | 'amount' | 'currency' | 'transactionAmount' | 'transactionCurrency'
  >,
): { entry: CashReportCurrencySplit; sortie: CashReportCurrencySplit } {
  const isEntry = transaction.type === CASH_TRANSACTION_TYPE.ENTRY
  const entry: CashReportCurrencySplit = { usd: 0, cdf: 0 }
  const sortie: CashReportCurrencySplit = { usd: 0, cdf: 0 }
  const target = isEntry ? entry : sortie

  const txCode = getCashTransactionCurrencyCode(transaction.transactionCurrency)
  const amountCode = getCashTransactionCurrencyCode(transaction.currency)
  const code = txCode ?? amountCode
  const amount = txCode
    ? parseFloat(transaction.transactionAmount) || 0
    : parseFloat(transaction.amount) || 0

  applyCashReportAmount(target, code, amount)

  return { entry, sortie }
}
