import type { HydraResource } from './hydra'
import type { Checkpoint } from './checkpoint'
import type { IssuingOffice } from './issuing-office'
import type { FreightPaymentMode, FreightStatus, NatureOfGoods, PackagingType } from '@/constants/freight'
import type { TicketUserRef } from './ticket'

export type FreightUserRef = TicketUserRef

export interface FreightPackage extends HydraResource {
  id: string
  packageNumber: string
  packagingType: PackagingType
  natureOfGoods: NatureOfGoods
  unitWeight: string
  totalWeight: string
}

export interface FreightShipment extends HydraResource {
  id: string
  ltaNumber: string
  shipmentDate: string
  airline?: string | null
  aircraft?: string | null
  registration?: string | null
  loadingPlace: string | Checkpoint
  unloadingPlace: string | Checkpoint
  senderName: string
  senderAddress: string
  senderPhone: string
  receiverName: string
  receiverAddress: string
  receiverPhone: string
  packageCount: number
  totalWeight: string
  unitPrice?: string
  renegotiatedPrice?: string | null
  ordinaryFreight: string
  volumeFreight: string
  rva: string
  ltaFees: string
  totalAmount: string
  currency?: string
  paidAmount: string
  remainingAmount: string
  /** Acompte encaissé au départ (mode ACC). Présent après migration API. */
  acompteAmount?: string
  /** Montant à recouvrer à destination (PD). Présent après migration API. */
  pdAmount?: string
  paymentMode: FreightPaymentMode
  status: FreightStatus
  sentAt?: string
  sentBy?: string | FreightUserRef
  arrivedAt?: string
  arrivedBy?: string | FreightUserRef
  deliveredAt?: string
  deliveredBy?: string | FreightUserRef
  cancelledAt?: string
  cancelledBy?: string | FreightUserRef
  archivedAt?: string
  archivedBy?: string | FreightUserRef
  observations?: string
  agent?: string | FreightUserRef
  issuingOffice?: string | IssuingOffice
  packages: FreightPackage[]
  createdAt?: string
  updatedAt?: string
}

export interface FreightPackageCreatePayload {
  packageNumber: string
  packagingType: string
  natureOfGoods: string
  unitWeight: string
  totalWeight: string
}

export interface FreightShipmentCreatePayload {
  shipmentDate: string
  airline?: string | null
  aircraft?: string | null
  registration?: string | null
  loadingPlace: string
  unloadingPlace: string
  senderName: string
  senderAddress: string
  senderPhone: string
  receiverName: string
  receiverAddress: string
  receiverPhone: string
  packageCount: number
  totalWeight: string
  unitPrice?: string
  renegotiatedPrice?: string | null
  ordinaryFreight: string
  volumeFreight: string
  rva: string
  ltaFees: string
  totalAmount: string
  currency: string
  paymentCurrency?: string
  paidAmountUsd?: string
  paidAmountCdf?: string
  /** Paiement mixte : taux manuel 1 USD = N CDF. */
  exchangeRate?: string
  paidAmount: string
  remainingAmount: string
  paymentMode: string
  observations: string
  cashRegister?: string
  packages: FreightPackageCreatePayload[]
}

/** PATCH /api/freight_shipments/{id} — n° LTA auto, non modifiable */
export interface FreightShipmentPatchPayload {
  shipmentDate: string
  airline?: string | null
  aircraft?: string | null
  registration?: string | null
  loadingPlace: string
  unloadingPlace: string
  senderName: string
  senderAddress: string
  senderPhone: string
  receiverName: string
  receiverAddress: string
  receiverPhone: string
  packageCount: number
  totalWeight: string
  unitPrice?: string
  renegotiatedPrice?: string | null
  ordinaryFreight: string
  volumeFreight: string
  rva: string
  ltaFees: string
  totalAmount: string
  currency: string
  paidAmount: string
  remainingAmount: string
  paymentMode: string
  observations: string
}

export interface FreightPackagePatchPayload {
  packageNumber: string
  packagingType: string
  natureOfGoods: string
  unitWeight: string
  totalWeight: string
}

export interface FreightStatusPayload {
  status: FreightStatus
}
