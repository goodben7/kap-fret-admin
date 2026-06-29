import { extractIri, normalizeIri } from '@/lib/hydra'
import type { CashRegisterCreateFormData, CashRegisterPatchFormData } from '@/schemas/cash-register.schema'
import type {
  CashRegisterCreatePayload,
  CashRegisterCurrencyRef,
  CashRegisterPatchPayload,
  CashRegisterResource,
} from '@/types/cash-register'

export function getCashRegisterCurrencyRef(
  currency: string | CashRegisterCurrencyRef | undefined,
): CashRegisterCurrencyRef | null {
  if (!currency || typeof currency === 'string') return null
  return currency
}

export function getCashRegisterCurrencyCode(
  currency: string | CashRegisterCurrencyRef | undefined,
  codeByIri?: ReadonlyMap<string, string>,
): string | null {
  if (!currency) return null
  if (typeof currency === 'object') return currency.code ?? null
  const iri = normalizeIri(currency)
  return codeByIri?.get(iri) ?? null
}

export function getCashRegisterCurrencyLabel(
  currency: string | CashRegisterCurrencyRef | undefined,
): string {
  const ref = getCashRegisterCurrencyRef(currency)
  if (ref) return `${ref.code} — ${ref.label}`
  return '—'
}

export function getCashRegisterCurrencyIri(register: CashRegisterResource): string {
  return extractIri(register.currency) ?? (typeof register.currency === 'string' ? register.currency : '')
}

export function toCashRegisterCreatePayload(data: CashRegisterCreateFormData): CashRegisterCreatePayload {
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    currency: normalizeIri(data.currency),
    openingBalance: formatBalanceValue(data.openingBalance),
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
    currency: getCashRegisterCurrencyIri(register),
    openingBalance: register.openingBalance,
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
