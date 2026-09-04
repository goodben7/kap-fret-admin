import { z } from 'zod'
import { BAGGAGE_TYPE } from '@/constants/check-in-baggage'
import { CURRENCY } from '@/constants/ticket'

const baggageTypes = [
  BAGGAGE_TYPE.REGULAR,
  BAGGAGE_TYPE.HAND,
  BAGGAGE_TYPE.HAND_HOLD,
  BAGGAGE_TYPE.OVERSIZE,
] as const

export const checkInBaggageItemSchema = z.object({
  id: z.string().optional(),
  weight: z.string().optional(),
  baggageType: z.enum(baggageTypes, { message: 'Type de bagage requis' }),
  description: z.string().optional(),
})

const checkInFieldsSchema = z.object({
  checkInWeight: z.string().min(1, 'Bagage Soute requis'),
  baggageAllowanceKg: z.string().min(1, 'Kilo total accordé requis'),
  excessWeightKg: z.string().min(1, 'Excédent requis'),
  excessPrice: z.string().min(1, 'Prix excédent requis'),
  currency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise requise' }),
  paymentCurrency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise de paiement requise' }),
  mixedPayment: z.boolean().optional(),
  paidAmountUsd: z.string().optional(),
  paidAmountCdf: z.string().optional(),
  exchangeRate: z.string().optional(),
  netToPay: z.string().min(1, 'Net à payer requis'),
  handBaggageWeight: z.string().optional(),
  observations: z.string().optional(),
  weightJustification: z.string().optional(),
  hasWeightReduction: z.boolean().optional(),
  destinationObservations: z.string().optional(),
  encodedAt: z.string().optional(),
  baggages: z.array(checkInBaggageItemSchema),
})

export const checkInCreateSchema = checkInFieldsSchema
  .extend({
    ticketIri: z.string().min(1, 'Billet requis'),
    cashRegister: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const excess = parseFloat(data.excessWeightKg) || 0
    if (excess > 0 && !data.cashRegister?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['cashRegister'],
        message: 'Caisse requise lorsqu\'il y a un excédent bagage',
      })
    }
    if (data.hasWeightReduction && !data.weightJustification?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['weightJustification'],
        message: 'Justification requise pour une réduction de poids',
      })
    }
    if (data.mixedPayment && excess > 0) {
      const usd = parseFloat(String(data.paidAmountUsd ?? '').replace(',', '.'))
      const cdf = parseFloat(String(data.paidAmountCdf ?? '').replace(',', '.'))
      if (!Number.isFinite(usd) || usd <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmountUsd'],
          message: 'Montant USD requis (> 0) pour un paiement mixte',
        })
      }
      if (!Number.isFinite(cdf) || cdf <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmountCdf'],
          message: 'Montant CDF requis (> 0) pour un paiement mixte',
        })
      }
      const rate = parseFloat(String(data.exchangeRate ?? '').replace(',', '.'))
      if (!Number.isFinite(rate) || rate <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['exchangeRate'],
          message: 'Taux de change requis (1 USD = N CDF)',
        })
      }
      const due = parseFloat(String(data.netToPay ?? '').replace(',', '.')) || 0
      if (Number.isFinite(usd) && usd >= due && due > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmountUsd'],
          message: 'En mixte, le USD doit être inférieur au net à payer',
        })
      }
    }
  })

export const checkInPatchSchema = checkInFieldsSchema
  .extend({
    ticketIri: z.string().optional(),
    cashRegister: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasWeightReduction && !data.weightJustification?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['weightJustification'],
        message: 'Justification requise pour une réduction de poids',
      })
    }
  })

export type CheckInBaggageItemFormData = z.infer<typeof checkInBaggageItemSchema>
export type CheckInCreateFormData = z.infer<typeof checkInCreateSchema>
export type CheckInPatchFormData = z.infer<typeof checkInPatchSchema>
export type CheckInFormData = CheckInCreateFormData
