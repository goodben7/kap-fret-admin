import { z } from 'zod'
import {
  CURRENCY,
  GENDER,
  PAYMENT_MODE,
  TICKET_CATEGORY,
  TICKET_CATEGORY_AGE_RANGE,
} from '@/constants/ticket'
import { ageFromBirthDate, isValidBirthDateInput, toDateInputValue } from '@/lib/passenger-age'

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

/** Sans `.transform()` — évite le mismatch input/output Zod ↔ react-hook-form. */
const optionalBirthDateSchema = z
  .string()
  .optional()
  .refine(
    (value) => {
      const trimmed = value?.trim() ?? ''
      if (trimmed === '') return true
      return isValidBirthDateInput(trimmed)
    },
    { message: 'Date de naissance invalide' },
  )
  .refine(
    (value) => {
      const trimmed = value?.trim() ?? ''
      if (trimmed === '') return true
      return trimmed <= toDateInputValue(new Date())
    },
    { message: 'La date de naissance ne peut pas être dans le futur' },
  )

function validateBirthDateForCategory(
  birthDate: string | undefined,
  category: keyof typeof TICKET_CATEGORY_AGE_RANGE | undefined,
  travelDate: string | undefined,
  path: (string | number)[],
  ctx: z.RefinementCtx,
) {
  const trimmed = birthDate?.trim()
  if (!trimmed || !category) return
  const age = ageFromBirthDate(trimmed, travelDate)
  if (age === undefined) return
  const range = TICKET_CATEGORY_AGE_RANGE[category]
  if (age < range.min || age > range.max) {
    ctx.addIssue({
      code: 'custom',
      path,
      message: `Âge calculé (${age} ans) hors plage ${range.min}–${range.max} pour cette catégorie`,
    })
  }
}

export const ticketPassengerSchema = z.object({
  ticketNumber: z.string().optional(),
  passengerName: z.string().min(2, 'Nom requis (min. 2 caractères)'),
  category: z.enum([TICKET_CATEGORY.INF, TICKET_CATEGORY.CD, TICKET_CATEGORY.AD], {
    message: 'Catégorie requise',
  }),
  birthDate: optionalBirthDateSchema,
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
    exchangeRate: z.string().optional(),
    sponsor: z.string().optional(),
    cashRegister: z.string().optional(),
    /** Acompte ACC (USD). */
    paidAmount: z.string().optional(),
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
      validateBirthDateForCategory(
        passenger.birthDate,
        passenger.category,
        data.travelDate,
        ['passengers', index, 'birthDate'],
        ctx,
      )
    })

    const groupTotal = data.passengers.reduce((sum, passenger) => {
      const base = parseFloat(String(passenger.basePrice ?? '').replace(',', '.')) || 0
      const tva = parseFloat(String(passenger.tva ?? '').replace(',', '.')) || 0
      const fpt = parseFloat(String(passenger.fpt ?? '').replace(',', '.')) || 0
      const rva = parseFloat(String(passenger.rva ?? '').replace(',', '.')) || 0
      return sum + base + tva + fpt + rva
    }, 0)

    if (data.paymentMode === PAYMENT_MODE.CASH && !data.reserveForLater && !data.cashRegister?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['cashRegister'], message: 'Caisse requise pour un paiement Cash' })
    }

    if (data.paymentMode === PAYMENT_MODE.ACC) {
      if (!data.cashRegister?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['cashRegister'], message: 'Caisse requise pour un acompte ACC' })
      }
      const deposit = parsePositiveAmount(String(data.paidAmount ?? ''))
      if (deposit === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmount'],
          message: 'Montant d\'acompte requis (> 0)',
        })
      } else if (deposit > groupTotal + 0.001) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmount'],
          message: 'L\'acompte ne peut pas dépasser le total',
        })
      }
    }

    const needsMixed =
      (data.paymentMode === PAYMENT_MODE.CASH || data.paymentMode === PAYMENT_MODE.ACC)
      && !data.reserveForLater
      && data.mixedPayment

    if (needsMixed) {
      if (parsePositiveAmount(String(data.paidAmountUsd ?? '')) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmountUsd'],
          message: 'Montant USD requis (> 0) pour un paiement mixte',
        })
      }
      if (parsePositiveAmount(String(data.paidAmountCdf ?? '')) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmountCdf'],
          message: 'Montant CDF requis (> 0) pour un paiement mixte',
        })
      }
      if (parsePositiveAmount(String(data.exchangeRate ?? '')) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['exchangeRate'],
          message: 'Taux de change requis (1 USD = N CDF)',
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
    birthDate: optionalBirthDateSchema,
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
    validateBirthDateForCategory(
      data.birthDate,
      data.category,
      data.travelDate,
      ['birthDate'],
      ctx,
    )
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
    birthDate: undefined,
    gender: GENDER.MALE,
    basePrice: '',
    tva: '0.00',
    fpt: '0.00',
    rva: '0.00',
    baggageAllowanceKg: '20',
    ...defaults,
  }
}
