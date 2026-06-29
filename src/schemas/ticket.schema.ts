import { z } from 'zod'
import { CURRENCY, GENDER, PAYMENT_MODE } from '@/constants/ticket'

export const ticketSchema = z
  .object({
    passengerName: z.string().min(2, 'Nom requis (min. 2 caractères)'),
    age: z.number({ message: 'Âge requis' }).min(1, 'Âge requis').max(120, 'Âge invalide'),
    gender: z.enum([GENDER.MALE, GENDER.FEMALE], { message: 'Sexe requis' }),
    phone: z.string().optional(),
    travelDate: z.string().min(1, 'Date de voyage requise'),
    travelTime: z.string().min(1, 'Heure de voyage requise'),
    paymentMode: z.enum([
      PAYMENT_MODE.CASH,
      PAYMENT_MODE.CARD,
      PAYMENT_MODE.MOBILE_MONEY,
      PAYMENT_MODE.SPONSOR,
    ]),
    currency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise requise' }),
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
  phone: z.string().optional(),
  travelDate: z.string().min(1, 'Date de voyage requise'),
  travelTime: z.string().min(1, 'Heure de voyage requise'),
  departure: z.string().min(1, 'Checkpoint de départ requis'),
  destination: z.string().min(1, 'Checkpoint de destination requis'),
  sponsor: z.string().optional(),
})

export type TicketFormData = z.infer<typeof ticketSchema>
export type TicketPatchFormData = z.infer<typeof ticketPatchSchema>
