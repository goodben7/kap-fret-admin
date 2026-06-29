import { z } from 'zod'

export const checkInBaggageTransactionSchema = z.object({
  cashRegister: z.string().min(1, 'Caisse requise'),
  amount: z.string().min(1, 'Montant requis'),
  description: z.string().min(1, 'Description requise'),
})

export type CheckInBaggageTransactionFormData = z.infer<typeof checkInBaggageTransactionSchema>
