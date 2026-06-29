import { z } from 'zod'

export const exchangeRateSchema = z
  .object({
    baseCurrency: z.string().min(1, 'Devise source requise'),
    targetCurrency: z.string().min(1, 'Devise cible requise'),
    baseRate: z.string().min(1, 'Montant source requis'),
    targetRate: z.string().min(1, 'Montant cible requis'),
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.baseCurrency && data.targetCurrency && data.baseCurrency === data.targetCurrency) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetCurrency'],
        message: 'La devise cible doit être différente de la source',
      })
    }
  })

export const exchangeRatePatchSchema = z.object({
  active: z.boolean(),
})

export type ExchangeRateFormData = z.infer<typeof exchangeRateSchema>
export type ExchangeRatePatchFormData = z.infer<typeof exchangeRatePatchSchema>
