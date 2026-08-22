import { CURRENCY, type Currency } from '@/constants/ticket'
import {
  CASH_REGISTER_MODULE,
  CASH_REGISTER_MODULE_LABELS,
  type CashRegisterModule,
} from '@/constants/cash-register'
import { formatMoney } from '@/lib/utils'
import { ROLES } from '@/constants/roles'
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
  const moduleLabel = register.module
    ? CASH_REGISTER_MODULE_LABELS[register.module] ?? register.module
    : null
  return moduleLabel
    ? `${register.code} — ${register.name} (${moduleLabel})`
    : `${register.code} — ${register.name}`
}

export function normalizeCashRegisterModule(module?: string | null): CashRegisterModule {
  if (
    module === CASH_REGISTER_MODULE.TICKETING
    || module === CASH_REGISTER_MODULE.FREIGHT
    || module === CASH_REGISTER_MODULE.GENERAL
  ) {
    return module
  }
  return CASH_REGISTER_MODULE.GENERAL
}

/** Modules de caisse visibles selon le rôle agent (admins voient tout). */
export function getAllowedCashRegisterModules(userRoles: string[]): CashRegisterModule[] | null {
  const isAdmin = userRoles.some((r) => r === ROLES.SPADM || r === ROLES.ADM || r === ROLES.MGR)
  if (isAdmin) return null

  const hasTkt = userRoles.includes(ROLES.TKT) || userRoles.includes(ROLES.CHK)
  const hasFrt = userRoles.includes(ROLES.FRT)

  if (hasTkt && hasFrt) return null
  if (hasTkt) return [CASH_REGISTER_MODULE.TICKETING, CASH_REGISTER_MODULE.GENERAL]
  if (hasFrt) return [CASH_REGISTER_MODULE.FREIGHT, CASH_REGISTER_MODULE.GENERAL]
  return null
}

export function filterCashRegistersForUserRoles<T extends Pick<CashRegisterResource, 'module'>>(
  registers: T[],
  userRoles: string[],
): T[] {
  const allowed = getAllowedCashRegisterModules(userRoles)
  if (!allowed) return registers
  return registers.filter((register) => {
    const module = normalizeCashRegisterModule(register.module)
    return allowed.includes(module)
  })
}

export function toCashRegisterCreatePayload(data: CashRegisterCreateFormData): CashRegisterCreatePayload {
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    openingBalanceCDF: formatBalanceValue(data.openingBalanceCDF),
    openingBalanceUSD: formatBalanceValue(data.openingBalanceUSD),
    active: data.active,
    module: data.module,
  }
}

export function toCashRegisterPatchPayload(data: CashRegisterPatchFormData): CashRegisterPatchPayload {
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    active: data.active,
    module: data.module,
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
    module: normalizeCashRegisterModule(register.module),
  }
}

export function cashRegisterToPatchFormDefaults(
  register: CashRegisterResource,
): CashRegisterPatchFormData {
  return {
    code: register.code,
    name: register.name,
    active: register.active,
    module: normalizeCashRegisterModule(register.module),
  }
}

function formatBalanceValue(value: string): string {
  const num = parseFloat(value)
  if (Number.isNaN(num)) return value.trim()
  return num.toFixed(2)
}
