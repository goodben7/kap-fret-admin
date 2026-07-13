import type { HydraResource } from './hydra'
import type { CashTransactionReferenceType, CashTransactionType } from '@/constants/cash-transaction'
import type { TicketUserRef } from './ticket'

export interface CashTransactionCurrencyRef extends HydraResource {
  id: string
  code: string
  label: string
  symbol: string
}

export interface CashTransactionCashRegisterRef extends HydraResource {
  id: string
  code?: string
  name?: string
  currency?: string | CashTransactionCurrencyRef
}

export interface CashTransactionIssuingOfficeRef extends HydraResource {
  id: string
  code?: string
  name?: string
}

/** @deprecated alias — même forme que CashTransactionCurrencyRef */
export type PreviewConversionCurrencyRef = CashTransactionCurrencyRef

export interface CashTransaction extends HydraResource {
  id: string
  cashRegister: string | CashTransactionCashRegisterRef
  type: CashTransactionType
  amount: string
  currency: string | CashTransactionCurrencyRef
  transactionAmount: string
  transactionCurrency: string | CashTransactionCurrencyRef
  rateUsed: string
  description: string
  referenceType: CashTransactionReferenceType
  referenceId: string
  transactionDate: string
  issuingOffice?: string | CashTransactionIssuingOfficeRef
  createdBy?: string | TicketUserRef
  createdAt?: string
  validated: boolean
}

export interface CashTransactionCreatePayload {
  cashRegister: string
  type: CashTransactionType
  amount: string
  currency: string
  paymentCurrency?: string
  description: string
  referenceType: CashTransactionReferenceType
  referenceId: string
  transactionDate: string
  validated: boolean
}

export interface PreviewConversionPayload {
  cashRegister: string
  /** Montant de référence (ex. total billet USD). */
  amount: string
  /** Devise du montant de référence (IRI). */
  currency: string
  /** Devise d'encaissement cible (IRI) — optionnel si identique à currency. */
  paymentCurrency?: string
}

export interface PreviewConversionOutput {
  '@id'?: string
  '@type'?: string
  originalAmount: string
  originalCurrency: PreviewConversionCurrencyRef
  convertedAmount: string
  convertedCurrency: PreviewConversionCurrencyRef
  rateUsed: string
}
