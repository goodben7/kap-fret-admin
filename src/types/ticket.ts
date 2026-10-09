import type { HydraResource } from './hydra'
import type { Checkpoint } from './checkpoint'
import type { IssuingOffice } from './issuing-office'
import type { Gender, PaymentMode, TicketStatus, Currency, TicketCategory } from '@/constants/ticket'

export interface CashRegisterRef extends HydraResource {
  id: string
  code?: string
  name?: string
}

export interface TicketUserRef {
  '@id'?: string
  '@type'?: string
  id: string
  email?: string
  phone?: string
  displayName?: string
}

export interface Ticket extends HydraResource {
  id: string
  ticketNumber: string
  passengerName: string
  age?: number
  /** Date de naissance (YYYY-MM-DD). */
  birthDate?: string | null
  category?: TicketCategory
  gender: Gender
  phone?: string
  departure: string | Checkpoint
  destination: string | Checkpoint
  travelDate: string
  travelTime: string
  issuingOffice: string | IssuingOffice
  issuingOfficeName?: string
  basePrice: string
  /** Devise du tarif billet (toujours USD côté métier). */
  currency?: Currency
  /** Devise choisie pour l'encaissement. */
  paymentCurrency?: Currency
  tva: string
  fpt: string
  rva: string
  baggageAllowanceKg: string
  paymentMode: PaymentMode
  sponsor?: string | null
  cashRegister?: string | CashRegisterRef
  totalAmount?: string
  paidAmount?: string
  issuingAgent?: string | TicketUserRef
  issuedAt?: string
  travelDateChangedAt?: string
  travelDateChangedBy?: string | TicketUserRef
  travelDateChangeComment?: string | null
  cancelledAt?: string
  cancelledBy?: string | TicketUserRef
  usedAt?: string
  usedBy?: string | TicketUserRef
  refundedAt?: string
  refundedBy?: string | TicketUserRef
  createdAt?: string
  updatedAt?: string
  status: TicketStatus
  /** UUID d'achat groupé (plusieurs billets d'une même vente). */
  purchaseGroupId?: string | null
}

export interface TicketPassengerCreatePayload {
  ticketNumber?: string | null
  passengerName: string
  age?: number
  birthDate?: string | null
  category: TicketCategory
  gender: Gender
  phone?: string
  basePrice: string
  tva: string
  fpt: string
  rva: string
  baggageAllowanceKg: string
}

export interface TicketBatchCreatePayload {
  phone: string
  departure: string
  destination: string
  travelDate: string
  travelTime: string
  currency: Currency
  paymentCurrency: Currency
  paymentMode: PaymentMode
  sponsor?: string | null
  cashRegister?: string
  /** Acompte ACC total du groupe (USD). */
  paidAmount?: string
  paidAmountUsd?: string
  paidAmountCdf?: string
  /** Paiement mixte : taux manuel 1 USD = N CDF. */
  exchangeRate?: string
  passengers: TicketPassengerCreatePayload[]
}

export interface TicketCreatePayload {
  ticketNumber?: string | null
  passengerName: string
  age?: number
  birthDate?: string | null
  category: TicketCategory
  gender: Gender
  phone: string
  departure: string
  destination: string
  travelDate: string
  travelTime: string
  basePrice: string
  /** Tarif billet en USD. */
  currency: Currency
  /** Devise d'encaissement (USD ou CDF). */
  paymentCurrency: Currency
  tva: string
  fpt: string
  rva: string
  baggageAllowanceKg: string
  paymentMode: PaymentMode
  sponsor: string | null
  cashRegister?: string
  /** Acompte ACC (USD). */
  paidAmount?: string
  /** Paiement mixte à la création : partie USD. */
  paidAmountUsd?: string
  /** Paiement mixte à la création : partie CDF. */
  paidAmountCdf?: string
  /** Paiement mixte : taux manuel 1 USD = N CDF. */
  exchangeRate?: string
}

/**
 * PATCH /api/tickets/{id}
 * Le statut passe par POST /api/tickets/{id}/status.
 * issuingOffice est exclu (non modifiable côté API à la mise à jour).
 */
export interface TicketPatchPayload {
  ticketNumber?: string
  passengerName: string
  age?: number | null
  birthDate?: string | null
  category?: TicketCategory
  gender: Gender
  phone: string
  departure: string
  destination: string
  travelDate: string
  travelTime: string
  basePrice?: string
  tva?: string
  fpt?: string
  rva?: string
  baggageAllowanceKg?: string
  paymentMode?: PaymentMode
  sponsor: string
}

export interface TicketStatusPayload {
  status: TicketStatus
}

export interface TicketReportTravelDatePayload {
  travelDate: string
  travelTime: string
  comment: string
}

export interface TicketPaymentPayload {
  /** Montant du billet en USD (mode simple). */
  amount?: string
  /** Devise d'encaissement (mode simple). */
  paymentCurrency: Currency
  /** Paiement mixte : partie USD. */
  paidAmountUsd?: string
  /** Paiement mixte : partie CDF. */
  paidAmountCdf?: string
  /** Paiement mixte : taux manuel 1 USD = N CDF. */
  exchangeRate?: string
  cashRegister: string
  description: string
}
