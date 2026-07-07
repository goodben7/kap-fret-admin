import type { HydraResource } from './hydra'

export interface CashRegisterResource extends HydraResource {
  id: string
  code: string
  name: string
  openingBalanceCDF: string
  openingBalanceUSD: string
  currentBalanceCDF: string
  currentBalanceUSD: string
  active: boolean
  deleted: boolean
  issuingOffice?: string
  createdAt?: string
  updatedAt?: string
}

export interface CashRegisterCreatePayload {
  code: string
  name: string
  openingBalanceCDF: string
  openingBalanceUSD: string
  active: boolean
}

export interface CashRegisterPatchPayload {
  code: string
  name: string
  active: boolean
}
