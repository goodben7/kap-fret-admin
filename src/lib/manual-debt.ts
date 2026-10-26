import { CURRENCY } from '@/constants/ticket'
import { MANUAL_DEBT_STATUS } from '@/constants/manual-debt'
import { formatExchangeRateForPayload } from '@/lib/mixed-payment'
import type { ManualDebtPaymentFormData } from '@/schemas/manual-debt.schema'
import type { ManualDebt, ManualDebtPaymentPayload } from '@/types/manual-debt'

export function getManualDebtRemaining(debt: Pick<ManualDebt, 'remainingAmount' | 'amount' | 'paidAmount'>): number {
  if (debt.remainingAmount != null && debt.remainingAmount !== '') {
    return parseFloat(debt.remainingAmount) || 0
  }
  const total = parseFloat(debt.amount) || 0
  const paid = parseFloat(debt.paidAmount) || 0
  return Math.max(0, total - paid)
}

export function isManualDebtOpen(debt: Pick<ManualDebt, 'status' | 'remainingAmount' | 'amount' | 'paidAmount'>): boolean {
  if (debt.status === MANUAL_DEBT_STATUS.CANCELLED || debt.status === MANUAL_DEBT_STATUS.SETTLED) {
    return false
  }
  return getManualDebtRemaining(debt) > 0.001
}

export function toManualDebtPaymentPayload(
  debt: Pick<ManualDebt, 'id' | 'debtorName' | 'remainingAmount' | 'amount' | 'paidAmount'>,
  data: ManualDebtPaymentFormData,
): ManualDebtPaymentPayload {
  const remaining = getManualDebtRemaining(debt).toFixed(2)
  if (data.mixedPayment) {
    const payload: ManualDebtPaymentPayload = {
      paymentCurrency: CURRENCY.USD,
      paidAmountUsd: data.paidAmountUsd?.trim() || '0',
      paidAmountCdf: data.paidAmountCdf?.trim() || '0',
      cashRegister: data.cashRegister,
      description: data.description.trim(),
    }
    const exchangeRate = formatExchangeRateForPayload(data.exchangeRate)
    if (exchangeRate) payload.exchangeRate = exchangeRate
    return payload
  }

  return {
    amount: data.amount?.trim() || remaining,
    paymentCurrency: data.paymentCurrency,
    cashRegister: data.cashRegister,
    description: data.description.trim(),
  }
}
