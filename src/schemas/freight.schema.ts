import { z } from 'zod'
import { CURRENCY } from '@/constants/ticket'
import {
  FREIGHT_PAYMENT_MODE,
  NATURE_OF_GOODS,
  PACKAGING_TYPE,
} from '@/constants/freight'

const packagingEnum = z.enum([
  PACKAGING_TYPE.BOX,
  PACKAGING_TYPE.CARTON,
  PACKAGING_TYPE.PALLET,
  PACKAGING_TYPE.BAG,
  PACKAGING_TYPE.CRATE,
  PACKAGING_TYPE.ENVELOPE,
  PACKAGING_TYPE.OTHER,
])

const natureEnum = z.enum([
  NATURE_OF_GOODS.GENERAL_CARGO,
  NATURE_OF_GOODS.PERISHABLE,
  NATURE_OF_GOODS.DANGEROUS_GOODS,
  NATURE_OF_GOODS.FRAGILE,
  NATURE_OF_GOODS.VALUABLES,
  NATURE_OF_GOODS.PHARMACEUTICALS,
  NATURE_OF_GOODS.OTHER,
])

export const freightPackageSchema = z.object({
  packageNumber: z.string().min(1, 'N° colis requis'),
  packagingType: packagingEnum,
  natureOfGoods: natureEnum,
  unitWeight: z.string().min(1, 'Poids unitaire requis'),
  totalWeight: z.string().min(1, 'Poids total requis'),
})

export const freightShipmentSchema = z
  .object({
  ltaNumber: z.string().min(1, 'Numéro LTA requis'),
  shipmentDate: z.string().min(1, 'Date requise'),
  shipmentTime: z.string().min(1, 'Heure requise'),
  airline: z.string().min(1, 'Compagnie aérienne requise'),
  aircraft: z.string().min(1, 'Avion requis'),
  registration: z.string().min(1, 'Immatriculation requise'),
  loadingPlace: z.string().min(1, 'Lieu de chargement requis'),
  unloadingPlace: z.string().min(1, 'Lieu de déchargement requis'),
  senderName: z.string().min(2, 'Nom expéditeur requis'),
  senderAddress: z.string().min(1, 'Adresse expéditeur requise'),
  senderPhone: z.string().min(1, 'Téléphone expéditeur requis'),
  receiverName: z.string().min(2, 'Nom destinataire requis'),
  receiverAddress: z.string().min(1, 'Adresse destinataire requise'),
  receiverPhone: z.string().min(1, 'Téléphone destinataire requis'),
  packageCount: z.number({ message: 'Nombre de colis requis' }).min(1, 'Au moins 1 colis'),
  totalWeight: z.string().min(1, 'Poids total requis'),
  ordinaryFreight: z.string().min(1, 'Fret ordinaire requis'),
  volumeFreight: z.string().min(1, 'Fret volume requis'),
  rva: z.string().min(1, 'RVA requis'),
  ltaFees: z.string().min(1, 'Frais LTA requis'),
  totalAmount: z.string().min(1, 'Montant total requis'),
  currency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise requise' }),
  paidAmount: z.string().min(1, 'Montant payé requis'),
  remainingAmount: z.string().min(1, 'Reste à payer requis'),
  paymentMode: z.enum([
    FREIGHT_PAYMENT_MODE.CASH,
    FREIGHT_PAYMENT_MODE.PARTIAL,
    FREIGHT_PAYMENT_MODE.AT_ARRIVAL,
  ]),
  observations: z.string().optional(),
  cashRegister: z.string().optional(),
  packages: z.array(freightPackageSchema).min(1, 'Au moins un colis requis'),
})
  .superRefine((data, ctx) => {
    if (
      (data.paymentMode === FREIGHT_PAYMENT_MODE.CASH || data.paymentMode === FREIGHT_PAYMENT_MODE.PARTIAL)
      && !data.cashRegister?.trim()
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['cashRegister'],
        message:
          data.paymentMode === FREIGHT_PAYMENT_MODE.CASH
            ? 'Caisse requise pour un paiement en espèces'
            : 'Caisse requise pour un acompte',
      })
    }

    if (data.paymentMode !== FREIGHT_PAYMENT_MODE.PARTIAL) return

    const total = parseFloat(data.totalAmount) || 0
    const paid = parseFloat(data.paidAmount) || 0
    if (paid > total) {
      ctx.addIssue({
        code: 'custom',
        path: ['paidAmount'],
        message: 'Le montant payé ne peut pas dépasser le montant total',
      })
    }
  })

export const freightShipmentPatchSchema = z
  .object({
  ltaNumber: z.string().min(1, 'Numéro LTA requis'),
  shipmentDate: z.string().min(1, 'Date requise'),
  shipmentTime: z.string().min(1, 'Heure requise'),
  airline: z.string().min(1, 'Compagnie aérienne requise'),
  aircraft: z.string().min(1, 'Avion requis'),
  registration: z.string().min(1, 'Immatriculation requise'),
  loadingPlace: z.string().min(1, 'Lieu de chargement requis'),
  unloadingPlace: z.string().min(1, 'Lieu de déchargement requis'),
  senderName: z.string().min(2, 'Nom expéditeur requis'),
  senderAddress: z.string().min(1, 'Adresse expéditeur requise'),
  senderPhone: z.string().min(1, 'Téléphone expéditeur requis'),
  receiverName: z.string().min(2, 'Nom destinataire requis'),
  receiverAddress: z.string().min(1, 'Adresse destinataire requise'),
  receiverPhone: z.string().min(1, 'Téléphone destinataire requis'),
  packageCount: z.number({ message: 'Nombre de colis requis' }).min(1, 'Au moins 1 colis'),
  totalWeight: z.string().min(1, 'Poids total requis'),
  ordinaryFreight: z.string().min(1, 'Fret ordinaire requis'),
  volumeFreight: z.string().min(1, 'Fret volume requis'),
  rva: z.string().min(1, 'RVA requis'),
  ltaFees: z.string().min(1, 'Frais LTA requis'),
  totalAmount: z.string().min(1, 'Montant total requis'),
  currency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise requise' }),
  paidAmount: z.string().min(1, 'Montant payé requis'),
  remainingAmount: z.string().min(1, 'Reste à payer requis'),
  paymentMode: z.enum([
    FREIGHT_PAYMENT_MODE.CASH,
    FREIGHT_PAYMENT_MODE.PARTIAL,
    FREIGHT_PAYMENT_MODE.AT_ARRIVAL,
  ]),
  observations: z.string().optional(),
})
  .superRefine((data, ctx) => {
    if (data.paymentMode !== FREIGHT_PAYMENT_MODE.PARTIAL) return

    const total = parseFloat(data.totalAmount) || 0
    const paid = parseFloat(data.paidAmount) || 0
    if (paid > total) {
      ctx.addIssue({
        code: 'custom',
        path: ['paidAmount'],
        message: 'Le montant payé ne peut pas dépasser le montant total',
      })
    }
  })

export type FreightPackageFormData = z.infer<typeof freightPackageSchema>
export type FreightShipmentFormData = z.infer<typeof freightShipmentSchema>
export type FreightShipmentPatchFormData = z.infer<typeof freightShipmentPatchSchema>
