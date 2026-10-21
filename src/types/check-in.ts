import type { CheckInPaymentMode } from '@/constants/check-in'
import type { BaggageType } from '@/constants/check-in-baggage'
import type { Currency } from '@/constants/ticket'
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
  paymentCurrency?: string
  netToPay: string
  paymentMode?: CheckInPaymentMode | string
  paidAmount?: string
  remainingAmount?: string
  acompteAmount?: string
  pdAmount?: string
  handBaggageWeight: string
  observations?: string
  weightJustification?: string | null
  hasWeightReduction?: boolean
  destinationObservations?: string | null
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
  paymentCurrency: string
  paymentMode: string
  /** Acompte ACC (montant encaissé à l'origine). */
  paidAmount?: string
  /** Paiement mixte : partie USD (avec paidAmountCdf). */
  paidAmountUsd?: string
  /** Paiement mixte : partie CDF (avec paidAmountUsd). */
  paidAmountCdf?: string
  /** Paiement mixte : taux manuel 1 USD = N CDF. */
  exchangeRate?: string
  netToPay: string
  handBaggageWeight: string
  observations: string
  weightJustification?: string | null
  hasWeightReduction: boolean
  destinationObservations?: string | null
  encodedAt?: string
  baggages: CheckInBaggageInput[]
}

/** POST /api/check_ins/batch — check-in groupé */
export interface CheckInBatchCreatePayload {
  tickets: string[]
  cashRegister?: string
  checkInWeight: string
  baggageAllowanceKg: string
  excessWeightKg: string
  excessPrice: string
  currency: string
  paymentCurrency: string
  paymentMode: string
  paidAmount?: string
  paidAmountUsd?: string
  paidAmountCdf?: string
  /** Paiement mixte : taux manuel 1 USD = N CDF. */
  exchangeRate?: string
  netToPay: string
  handBaggageWeight: string
  observations: string
  weightJustification?: string | null
  hasWeightReduction: boolean
  destinationObservations?: string | null
  encodedAt?: string
  baggages: CheckInBaggageInput[]
}

/** POST /api/check_ins/{id}/payment */
export interface CheckInPaymentPayload {
  amount?: string
  paymentCurrency: Currency
  paidAmountUsd?: string
  paidAmountCdf?: string
  exchangeRate?: string
  cashRegister: string
  description: string
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
  weightJustification?: string | null
  hasWeightReduction: boolean
  destinationObservations?: string | null
  encodedAt?: string
  baggages: CheckInBaggagePatchInput[]
}

export interface CheckInBaggagePatchPayload {
  weight: string
  baggageType: BaggageType
  description?: string
}
