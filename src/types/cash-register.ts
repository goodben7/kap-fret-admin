import type { HydraResource } from './hydra'
import type { CashRegisterModule } from '@/constants/cash-register'

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
  module?: CashRegisterModule
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
  module: CashRegisterModule
}

export interface CashRegisterPatchPayload {
  code: string
  name: string
  active: boolean
  module: CashRegisterModule
}
