import type { HydraResource } from './hydra'
import type { IssuingOffice } from './issuing-office'

export interface CurrencyResource extends HydraResource {
  id: string
  code: string
  label: string
  symbol: string
  active: boolean
  deleted: boolean
  isDefault: boolean
  issuingOffice?: string | Pick<IssuingOffice, '@id' | 'id' | 'name'>
  createdAt?: string
  updatedAt?: string
}

export interface CurrencyPayload {
  code: string
  label: string
  symbol: string
  active: boolean
  isDefault: boolean
}
