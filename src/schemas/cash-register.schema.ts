import { z } from 'zod'

export const cashRegisterCreateSchema = z.object({
  code: z.string().min(2, 'Code requis'),
  name: z.string().min(2, 'Nom requis'),
  openingBalanceCDF: z.string().min(1, 'Solde d\'ouverture CDF requis'),
  openingBalanceUSD: z.string().min(1, 'Solde d\'ouverture USD requis'),
  active: z.boolean(),
})

export const cashRegisterPatchSchema = z.object({
  code: z.string().min(2, 'Code requis'),
  name: z.string().min(2, 'Nom requis'),
  active: z.boolean(),
})

export type CashRegisterCreateFormData = z.infer<typeof cashRegisterCreateSchema>
export type CashRegisterPatchFormData = z.infer<typeof cashRegisterPatchSchema>
