import { z } from 'zod'
import { CHECK_IN_PAYMENT_MODE } from '@/constants/check-in'
import { BAGGAGE_TYPE } from '@/constants/check-in-baggage'
import { CURRENCY } from '@/constants/ticket'

const baggageTypes = [
  BAGGAGE_TYPE.REGULAR,
  BAGGAGE_TYPE.HAND,
  BAGGAGE_TYPE.HAND_HOLD,
  BAGGAGE_TYPE.OVERSIZE,
] as const

const paymentModes = [
  CHECK_IN_PAYMENT_MODE.CASH,
  CHECK_IN_PAYMENT_MODE.ACC,
  CHECK_IN_PAYMENT_MODE.PTA,
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
  paymentMode: z.enum(paymentModes).optional(),
  /** Acompte ACC — montant encaissé à l'origine */
  paidAmount: z.string().optional(),
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
    const net = parseFloat(String(data.netToPay ?? '').replace(',', '.')) || 0
    const mode = data.paymentMode ?? CHECK_IN_PAYMENT_MODE.CASH
    const deposit = parseFloat(String(data.paidAmount ?? '').replace(',', '.')) || 0

    if (data.hasWeightReduction && !data.weightJustification?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['weightJustification'],
        message: 'Justification requise pour une réduction de poids',
      })
    }

    if (excess <= 0 || net <= 0) return

    if (mode === CHECK_IN_PAYMENT_MODE.ACC) {
      if (deposit <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmount'],
          message: "L'acompte doit être supérieur à 0",
        })
      } else if (deposit >= net) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmount'],
          message: "L'acompte doit être inférieur au net à payer (sinon choisissez Cash)",
        })
      }
      if (!data.cashRegister?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['cashRegister'],
          message: 'Caisse requise pour un acompte ACC',
        })
      }
    } else if (mode === CHECK_IN_PAYMENT_MODE.CASH) {
      if (!data.cashRegister?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['cashRegister'],
          message: "Caisse requise lorsqu'il y a un excédent bagage",
        })
      }
    }
    // PTA : pas de caisse à l'origine

    if (data.mixedPayment && mode !== CHECK_IN_PAYMENT_MODE.PTA) {
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
      const dueForMixed = mode === CHECK_IN_PAYMENT_MODE.ACC ? deposit : net
      if (Number.isFinite(usd) && usd >= dueForMixed && dueForMixed > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmountUsd'],
          message: 'En mixte, le USD doit être inférieur au montant encaissé',
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
