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
  /** Null tant que la LTA n'a pas de date (posée au SENT si absente). */
  shipmentDate?: string | null
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
  sentAt?: string | null
  sentBy?: string | FreightUserRef
  arrivedAt?: string
  arrivedBy?: string | FreightUserRef
  /** Dérivé CGU #1 — échéance paiement après arrivée. */
  paymentDueAt?: string | null
  /** Dérivé CGU #3 — échéance enlèvement selon mode. */
  pickupDueAt?: string | null
  /** Dérivé — retard paiement (ARRIVED + reste > 0). */
  paymentOverdue?: boolean
  /** Dérivé — retard enlèvement (ARRIVED). */
  pickupOverdue?: boolean
  /** Dérivé CGU #5 — fin de grâce entreposage. */
  storageGraceEndsAt?: string | null
  /** Dérivé CGU #5 — jours facturables d'entreposage. */
  storageBillableDays?: number
  /** Dérivé CGU #5 — frais d'entreposage estimés. */
  storageFees?: string | null
  /** Dérivé CGU #6 — échéance liquidation J+15. */
  liquidationDueAt?: string | null
  /** Dérivé CGU #6 — éligible au statut PENDING_LIQUIDATION. */
  eligibleForLiquidation?: boolean
  /** #13 — signatures LTA */
  issuerSignedAt?: string | null
  issuerSignedBy?: string | FreightUserRef
  cashierSignedAt?: string | null
  cashierSignedBy?: string | FreightUserRef
  ltaFullySigned?: boolean
  /** #10 — réclamation perte/vol */
  claimLostWeightKg?: string | null
  claimAmountUsd?: string | null
  claimNotes?: string | null
  claimAt?: string | null
  claimBy?: string | FreightUserRef
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
  shipmentDate?: string | null
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
  shipmentDate?: string | null
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
  /** Posée au passage SENT (ex. date du vol d'expédition). */
  shipmentDate?: string | null
  observations?: string | null
}
