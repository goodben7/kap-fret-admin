import type { BaggageType } from '@/constants/check-in-baggage'
import type { HydraResource } from './hydra'
import type { IssuingOffice } from './issuing-office'
import type { Ticket } from './ticket'

export interface CheckInBaggage extends HydraResource {
  id: string
  weight: string
  baggageType: BaggageType
  description?: string
  createdAt?: string
}

export interface CheckIn extends HydraResource {
  id: string
  ticket: string | Ticket
  issuingOffice?: string | IssuingOffice
  checkInWeight: string
  baggageAllowanceKg: string
  excessWeightKg: string
  excessPrice: string
  currency?: string
  netToPay: string
  handBaggageWeight: string
  observations?: string
  encodedAt?: string
  baggages?: CheckInBaggage[]
  status?: string
  cancelledAt?: string
  cancelledBy?: string
  updatedAt?: string
  createdAt?: string
}

export interface CheckInBaggageInput {
  weight: string
  baggageType: BaggageType
  description?: string
}

export interface CheckInBaggagePatchInput extends CheckInBaggageInput {
  id?: string
}

export interface CheckInCreatePayload {
  ticket: string
  cashRegister?: string
  checkInWeight: string
  baggageAllowanceKg: string
  excessWeightKg: string
  excessPrice: string
  currency: string
  netToPay: string
  handBaggageWeight: string
  observations: string
  encodedAt?: string
  baggages: CheckInBaggageInput[]
}

/** PATCH /api/check_ins/{id} — sans ticket, caisse ni issuingOffice */
export interface CheckInPatchPayload {
  checkInWeight: string
  baggageAllowanceKg: string
  excessWeightKg: string
  excessPrice: string
  netToPay: string
  handBaggageWeight: string
  observations: string
  encodedAt?: string
  baggages: CheckInBaggagePatchInput[]
}

export interface CheckInBaggagePatchPayload {
  weight: string
  baggageType: BaggageType
  description?: string
}
