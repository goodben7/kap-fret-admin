import { z } from 'zod'
import {
  CURRENCY,
  GENDER,
  PAYMENT_MODE,
  TICKET_CATEGORY,
  TICKET_CATEGORY_AGE_RANGE,
} from '@/constants/ticket'

function parsePositiveAmount(value: string): number | null {
  const amount = parseFloat(value.replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

function parseNonNegativeAmount(value: string): number | null {
  const amount = parseFloat(value.replace(',', '.'))
  if (!Number.isFinite(amount) || amount < 0) return null
  return amount
}

const optionalAgeSchema = z.union([
  z.number().min(0, 'Âge invalide').max(120, 'Âge invalide'),
  z.nan().transform(() => undefined),
]).optional()

export const ticketPassengerSchema = z.object({
  ticketNumber: z.string().optional(),
  passengerName: z.string().min(2, 'Nom requis (min. 2 caractères)'),
  category: z.enum([TICKET_CATEGORY.INF, TICKET_CATEGORY.CD, TICKET_CATEGORY.AD], {
    message: 'Catégorie requise',
  }),
  age: optionalAgeSchema,
  gender: z.enum([GENDER.MALE, GENDER.FEMALE], { message: 'Sexe requis' }),
  basePrice: z.string().min(1, 'Prix de base requis'),
  tva: z.string().min(1, 'TVA requise'),
  fpt: z.string().min(1, 'FPT requis'),
  rva: z.string().min(1, 'RVA requis'),
  baggageAllowanceKg: z.string().min(1, 'Franchise bagage requise'),
})

export const ticketSchema = z
  .object({
    /** Téléphone de contact du groupe (ou du passager unique). */
    phone: z.string().trim().min(1, 'Téléphone requis'),
    passengers: z.array(ticketPassengerSchema).min(1, 'Au moins un passager'),
    travelDate: z.string().min(1, 'Date de voyage requise'),
    travelTime: z.string().min(1, 'Heure de voyage requise'),
    paymentMode: z.enum([
      PAYMENT_MODE.CASH,
      PAYMENT_MODE.ACC,
      PAYMENT_MODE.PTA,
    ]),
    paymentCurrency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise de paiement requise' }),
    mixedPayment: z.boolean().optional(),
    paidAmountUsd: z.string().optional(),
    paidAmountCdf: z.string().optional(),
    sponsor: z.string().optional(),
    cashRegister: z.string().optional(),
    reserveForLater: z.boolean().optional(),
    departure: z.string().min(1, 'Checkpoint de départ requis'),
    destination: z.string().min(1, 'Checkpoint de destination requis'),
  })
  .superRefine((data, ctx) => {
    data.passengers.forEach((passenger, index) => {
      if (parsePositiveAmount(passenger.basePrice) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['passengers', index, 'basePrice'],
          message: 'Le prix de base doit être supérieur à 0',
        })
      }
      if (passenger.age !== undefined) {
        const range = TICKET_CATEGORY_AGE_RANGE[passenger.category]
        if (passenger.age < range.min || passenger.age > range.max) {
          ctx.addIssue({
            code: 'custom',
            path: ['passengers', index, 'age'],
            message: `L'âge doit être entre ${range.min} et ${range.max} ans pour cette catégorie`,
          })
        }
      }
    })

    if (data.paymentMode === PAYMENT_MODE.CASH && !data.reserveForLater && !data.cashRegister?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['cashRegister'], message: 'Caisse requise pour un paiement Cash' })
    }

    if (
      data.paymentMode === PAYMENT_MODE.CASH
      && !data.reserveForLater
      && data.mixedPayment
    ) {
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
    }
  })

/** Champs modifiables via PATCH /api/tickets/{id} */
export const ticketPatchSchema = z
  .object({
    ticketNumber: z.string().min(1, 'N° billet requis'),
    passengerName: z.string().min(2, 'Nom requis (min. 2 caractères)'),
    category: z.enum([TICKET_CATEGORY.INF, TICKET_CATEGORY.CD, TICKET_CATEGORY.AD], {
      message: 'Catégorie requise',
    }).optional(),
    age: optionalAgeSchema,
    gender: z.enum([GENDER.MALE, GENDER.FEMALE], { message: 'Sexe requis' }),
    phone: z.string().trim().min(1, 'Téléphone requis'),
    travelDate: z.string().min(1, 'Date de voyage requise'),
    travelTime: z.string().min(1, 'Heure de voyage requise'),
    departure: z.string().min(1, 'Checkpoint de départ requis'),
    destination: z.string().min(1, 'Checkpoint de destination requis'),
    basePrice: z.string().min(1, 'Prix de base requis'),
    tva: z.string().min(1, 'TVA requise'),
    fpt: z.string().min(1, 'FPT requis'),
    rva: z.string().min(1, 'RVA requis'),
    baggageAllowanceKg: z.string().min(1, 'Franchise bagage requise'),
    paymentMode: z.enum([
      PAYMENT_MODE.CASH,
      PAYMENT_MODE.ACC,
      PAYMENT_MODE.PTA,
    ]),
    sponsor: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (parsePositiveAmount(data.basePrice) === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['basePrice'],
        message: 'Le prix de base doit être supérieur à 0',
      })
    }
    for (const field of ['tva', 'fpt', 'rva', 'baggageAllowanceKg'] as const) {
      if (parseNonNegativeAmount(data[field]) === null) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Montant invalide',
        })
      }
    }
    if (data.age !== undefined && data.category) {
      const range = TICKET_CATEGORY_AGE_RANGE[data.category]
      if (data.age < range.min || data.age > range.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['age'],
          message: `L'âge doit être entre ${range.min} et ${range.max} ans pour cette catégorie`,
        })
      }
    }
  })

export type TicketPassengerFormData = z.infer<typeof ticketPassengerSchema>
export type TicketFormData = z.infer<typeof ticketSchema>
export type TicketPatchFormData = z.infer<typeof ticketPatchSchema>

export function createEmptyTicketPassenger(
  defaults?: Partial<TicketPassengerFormData>,
): TicketPassengerFormData {
  return {
    ticketNumber: '',
    passengerName: '',
    category: TICKET_CATEGORY.AD,
    age: undefined,
    gender: GENDER.MALE,
    basePrice: '',
    tva: '0.00',
    fpt: '0.00',
    rva: '0.00',
    baggageAllowanceKg: '20',
    ...defaults,
  }
}
