import { CURRENCY, type Currency } from '@/constants/ticket'
import { formatMoney } from '@/lib/utils'
import type { CashRegisterCreateFormData, CashRegisterPatchFormData } from '@/schemas/cash-register.schema'
import type {
  CashRegisterCreatePayload,
  CashRegisterPatchPayload,
  CashRegisterResource,
} from '@/types/cash-register'

export function parseCashRegisterBalance(value: string | undefined): number {
  return parseFloat(value ?? '') || 0
}

export function getCashRegisterCurrentBalance(
  register: CashRegisterResource,
  currency: Currency,
): number {
  return currency === CURRENCY.USD
    ? parseCashRegisterBalance(register.currentBalanceUSD)
    : parseCashRegisterBalance(register.currentBalanceCDF)
}

export function formatCashRegisterBalancesSummary(register: CashRegisterResource): string {
  const usd = parseCashRegisterBalance(register.currentBalanceUSD)
  const cdf = parseCashRegisterBalance(register.currentBalanceCDF)
  return `${formatMoney(usd, CURRENCY.USD)} · ${formatMoney(cdf, CURRENCY.CDF)}`
}

export function formatCashRegisterSelectLabel(register: CashRegisterResource): string {
  return `${register.code} — ${register.name}`
}

export function toCashRegisterCreatePayload(data: CashRegisterCreateFormData): CashRegisterCreatePayload {
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    openingBalanceCDF: formatBalanceValue(data.openingBalanceCDF),
    openingBalanceUSD: formatBalanceValue(data.openingBalanceUSD),
    active: data.active,
  }
}

export function toCashRegisterPatchPayload(data: CashRegisterPatchFormData): CashRegisterPatchPayload {
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    active: data.active,
  }
}

export function cashRegisterToCreateFormDefaults(
  register: CashRegisterResource,
): CashRegisterCreateFormData {
  return {
    code: register.code,
    name: register.name,
    openingBalanceCDF: register.openingBalanceCDF,
    openingBalanceUSD: register.openingBalanceUSD,
    active: register.active,
  }
}

export function cashRegisterToPatchFormDefaults(
  register: CashRegisterResource,
): CashRegisterPatchFormData {
  return {
    code: register.code,
    name: register.name,
    active: register.active,
  }
}

function formatBalanceValue(value: string): string {
  const num = parseFloat(value)
  if (Number.isNaN(num)) return value.trim()
  return num.toFixed(2)
}
