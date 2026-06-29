import type { HydraResource } from './hydra'
import type { Checkpoint } from './entities'

export interface IssuingOfficeCurrencyRef extends HydraResource {
  id: string
  code: string
  label: string
  symbol: string
}

export interface IssuingOffice extends HydraResource {
  id: string
  code: string
  name: string
  checkpoint: string | Checkpoint
  currency?: string | IssuingOfficeCurrencyRef
  address?: string
  phone?: string
  active: boolean
  adminAccountCreated?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface IssuingOfficeCreatePayload {
  code: string
  name: string
  checkpoint: string
  address?: string
  phone?: string
  active: boolean
}

export interface IssuingOfficePatchPayload {
  code: string
  name: string
  checkpoint: string
  currency?: string
  address?: string
  phone?: string
  active: boolean
}

/** @deprecated Utiliser IssuingOfficeCreatePayload ou IssuingOfficePatchPayload */
export type IssuingOfficePayload = IssuingOfficePatchPayload

export interface OfficeAdminAccessPayload {
  email: string
  plainPassword: string
  profile: string
  phone: string
  displayName: string
  holderId: string
  holderType: 'ISSUING_OFFICE'
}
