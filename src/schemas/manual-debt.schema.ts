import { z } from 'zod'
import { MANUAL_DEBT_CURRENCY } from '@/constants/manual-debt'
import { ticketPaymentSchema } from '@/schemas/ticket-payment.schema'

export const manualDebtCreateSchema = z.object({
  debtorName: z.string().trim().min(2, 'Nom du débiteur requis'),
  debtorPhone: z.string().trim().optional(),
  amount: z
    .string()
    .trim()
    .refine((v) => {
      const n = parseFloat(v.replace(',', '.'))
      return Number.isFinite(n) && n > 0
    }, 'Montant invalide (> 0)'),
  currency: z.enum([MANUAL_DEBT_CURRENCY.USD, MANUAL_DEBT_CURRENCY.CDF]),
  reason: z.string().trim().min(3, 'Motif requis (min. 3 caractères)'),
  notes: z.string().trim().optional(),
})

export type ManualDebtCreateFormData = z.infer<typeof manualDebtCreateSchema>

/** Réutilise le schéma d’encaissement billets (simple + mixte). */
export const manualDebtPaymentSchema = ticketPaymentSchema
export type ManualDebtPaymentFormData = z.infer<typeof manualDebtPaymentSchema>
