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

const optionalAgeSchema = z.union([
  z.number().min(0, 'Âge invalide').max(120, 'Âge invalide'),
  z.nan().transform(() => undefined),
]).optional()

export const ticketSchema = z
  .object({
    passengerName: z.string().min(2, 'Nom requis (min. 2 caractères)'),
    category: z.enum([TICKET_CATEGORY.INF, TICKET_CATEGORY.CD, TICKET_CATEGORY.AD], {
      message: 'Catégorie requise',
    }),
    age: optionalAgeSchema,
    gender: z.enum([GENDER.MALE, GENDER.FEMALE], { message: 'Sexe requis' }),
    phone: z.string().trim().min(1, 'Téléphone requis'),
    travelDate: z.string().min(1, 'Date de voyage requise'),
    travelTime: z.string().min(1, 'Heure de voyage requise'),
    paymentMode: z.enum([
      PAYMENT_MODE.CASH,
      PAYMENT_MODE.CARD,
      PAYMENT_MODE.MOBILE_MONEY,
      PAYMENT_MODE.SPONSOR,
    ]),
    paymentCurrency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise de paiement requise' }),
    basePrice: z.string().min(1, 'Prix de base requis'),
    tva: z.string().min(1, 'TVA requise'),
    fpt: z.string().min(1, 'FPT requis'),
    rva: z.string().min(1, 'RVA requis'),
    baggageAllowanceKg: z.string().min(1, 'Franchise bagage requise'),
    sponsor: z.string().optional(),
    cashRegister: z.string().optional(),
    reserveForLater: z.boolean().optional(),
    departure: z.string().min(1, 'Checkpoint de départ requis'),
    destination: z.string().min(1, 'Checkpoint de destination requis'),
  })
  .superRefine((data, ctx) => {
    if (parsePositiveAmount(data.basePrice) === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['basePrice'],
        message: 'Le prix de base doit être supérieur à 0',
      })
    }

    if (data.age !== undefined) {
      const range = TICKET_CATEGORY_AGE_RANGE[data.category]
      if (data.age < range.min || data.age > range.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['age'],
          message: `L'âge doit être entre ${range.min} et ${range.max} ans pour cette catégorie`,
        })
      }
    }

    if (data.paymentMode === PAYMENT_MODE.SPONSOR && !data.sponsor?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['sponsor'], message: 'Sponsor requis' })
    }
    if (data.paymentMode === PAYMENT_MODE.CASH && !data.reserveForLater && !data.cashRegister?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['cashRegister'], message: 'Caisse requise pour un paiement en espèces' })
    }
  })

/** Champs modifiables via PATCH /api/tickets/{id} */
export const ticketPatchSchema = z.object({
  passengerName: z.string().min(2, 'Nom requis (min. 2 caractères)'),
  age: z.number({ message: 'Âge requis' }).min(1, 'Âge requis').max(120, 'Âge invalide'),
    gender: z.enum([GENDER.MALE, GENDER.FEMALE], { message: 'Sexe requis' }),
    phone: z.string().trim().min(1, 'Téléphone requis'),
    travelDate: z.string().min(1, 'Date de voyage requise'),
  travelTime: z.string().min(1, 'Heure de voyage requise'),
  departure: z.string().min(1, 'Checkpoint de départ requis'),
  destination: z.string().min(1, 'Checkpoint de destination requis'),
  sponsor: z.string().optional(),
})

export type TicketFormData = z.infer<typeof ticketSchema>
export type TicketPatchFormData = z.infer<typeof ticketPatchSchema>
