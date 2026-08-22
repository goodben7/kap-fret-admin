import { z } from 'zod'
import { CURRENCY } from '@/constants/ticket'

export const ticketPaymentSchema = z.object({
  amount: z.string().optional(),
  cashRegister: z.string().min(1, 'Caisse requise'),
  paymentCurrency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise de paiement requise' }),
  mixedPayment: z.boolean().optional(),
  paidAmountUsd: z.string().optional(),
  paidAmountCdf: z.string().optional(),
  description: z.string().min(1, 'Description requise'),
}).superRefine((data, ctx) => {
  if (data.mixedPayment) {
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
    return
  }

  const amount = parseFloat(String(data.amount ?? '').replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['amount'],
      message: 'Le montant doit être supérieur à 0',
    })
  }
})

export type TicketPaymentFormData = z.infer<typeof ticketPaymentSchema>
