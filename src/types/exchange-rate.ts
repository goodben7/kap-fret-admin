import type { HydraResource } from './hydra'

export interface ExchangeRateCurrencyRef extends HydraResource {
  id: string
  code: string
  label: string
  symbol: string
}

export interface ExchangeRateResource extends HydraResource {
  id: string
  baseCurrency: string | ExchangeRateCurrencyRef
  targetCurrency: string | ExchangeRateCurrencyRef
  rate: string
  baseRate: string
  targetRate: string
  active: boolean
  deleted: boolean
  createdAt?: string
}

export interface ExchangeRateCreatePayload {
  baseCurrency: string
  targetCurrency: string
  baseRate: string
  targetRate: string
  active: boolean
}

export interface ExchangeRatePatchPayload {
  active?: boolean
  baseRate?: string
  targetRate?: string
  baseCurrency?: string
  targetCurrency?: string
}
