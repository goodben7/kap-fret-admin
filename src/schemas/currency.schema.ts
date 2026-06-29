import { z } from 'zod'

export const currencySchema = z.object({
  code: z
    .string()
    .min(2, 'Code requis (min. 2 caractères)')
    .max(5, 'Code max. 5 caractères')
    .transform((v) => v.trim().toUpperCase()),
  label: z.string().min(2, 'Libellé requis'),
  symbol: z.string().min(1, 'Symbole requis').max(10, 'Symbole max. 10 caractères'),
  active: z.boolean(),
  isDefault: z.boolean(),
})

export type CurrencyFormData = z.infer<typeof currencySchema>
