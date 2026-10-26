import type { HydraResource } from './hydra'
import type { IssuingOffice } from './issuing-office'
import type { ManualDebtCurrency, ManualDebtStatus } from '@/constants/manual-debt'
import type { Currency } from '@/constants/ticket'

export interface ManualDebtUserRef {
  '@id'?: string
  '@type'?: string
  id: string
  email?: string
  firstName?: string
  lastName?: string
  displayName?: string
}

export interface ManualDebt extends HydraResource {
  id: string
  debtorName: string
  debtorPhone?: string | null
  amount: string
  paidAmount: string
  remainingAmount: string
  currency: ManualDebtCurrency
  reason: string
  notes?: string | null
  status: ManualDebtStatus
  issuingOffice?: string | IssuingOffice
  createdBy?: string | ManualDebtUserRef
  createdAt?: string
  updatedAt?: string | null
  settledAt?: string | null
}

export interface ManualDebtCreatePayload {
  debtorName: string
  debtorPhone?: string | null
  amount: string
  currency: ManualDebtCurrency
  reason: string
  notes?: string | null
}

export interface ManualDebtPaymentPayload {
  amount?: string
  paymentCurrency: Currency
  paidAmountUsd?: string
  paidAmountCdf?: string
  exchangeRate?: string
  cashRegister: string
  description: string
}
