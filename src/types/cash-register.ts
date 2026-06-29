import type { HydraResource } from './hydra'

export interface CashRegisterCurrencyRef extends HydraResource {
  id: string
  code: string
  label: string
  symbol: string
}

export interface CashRegisterResource extends HydraResource {
  id: string
  code: string
  name: string
  currency: string | CashRegisterCurrencyRef
  openingBalance: string
  currentBalance: string
  active: boolean
  deleted: boolean
  issuingOffice?: string
  createdAt?: string
  updatedAt?: string
}

export interface CashRegisterCreatePayload {
  code: string
  name: string
  currency: string
  openingBalance: string
  active: boolean
}

export interface CashRegisterPatchPayload {
  code: string
  name: string
  active: boolean
}
