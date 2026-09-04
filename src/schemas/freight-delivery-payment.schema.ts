import { z } from 'zod'

export const freightDeliveryPaymentSchema = z.object({
  cashRegister: z.string().min(1, 'Caisse requise'),
  amount: z.string().min(1, 'Montant requis'),
  description: z.string().min(1, 'Description requise'),
  mixedPayment: z.boolean().optional(),
  paidAmountUsd: z.string().optional(),
  paidAmountCdf: z.string().optional(),
  exchangeRate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.mixedPayment) return
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
})

export type FreightDeliveryPaymentFormData = z.infer<typeof freightDeliveryPaymentSchema>
