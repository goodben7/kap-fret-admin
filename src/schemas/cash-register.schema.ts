import { z } from 'zod'

export const cashRegisterCreateSchema = z.object({
  code: z.string().min(2, 'Code requis'),
  name: z.string().min(2, 'Nom requis'),
  currency: z.string().min(1, 'Devise requise'),
  openingBalance: z.string().min(1, 'Solde d\'ouverture requis'),
  active: z.boolean(),
})

export const cashRegisterPatchSchema = z.object({
  code: z.string().min(2, 'Code requis'),
  name: z.string().min(2, 'Nom requis'),
  active: z.boolean(),
})

export type CashRegisterCreateFormData = z.infer<typeof cashRegisterCreateSchema>
export type CashRegisterPatchFormData = z.infer<typeof cashRegisterPatchSchema>
