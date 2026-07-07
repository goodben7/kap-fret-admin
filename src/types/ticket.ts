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
}

export interface TicketCreatePayload {
  passengerName: string
  age?: number
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
}

/**
 * PATCH /api/tickets/{id}
 * Le statut passe par POST /api/tickets/{id}/status.
 * issuingOffice est exclu (non modifiable côté API à la mise à jour).
 */
export interface TicketPatchPayload {
  passengerName: string
  age: number
  gender: Gender
  phone: string
  departure: string
  destination: string
  travelDate: string
  travelTime: string
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
  /** Montant du billet en USD. */
  amount: string
  /** Devise d'encaissement. */
  paymentCurrency: Currency
  cashRegister: string
  description: string
}
