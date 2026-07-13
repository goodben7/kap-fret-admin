import { z } from 'zod'
import { CURRENCY } from '@/constants/ticket'

export const checkInBaggageTransactionSchema = z.object({
  cashRegister: z.string().min(1, 'Caisse requise'),
  amount: z.string().min(1, 'Montant requis'),
  paymentCurrency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise de paiement requise' }),
  description: z.string().min(1, 'Description requise'),
})

export type CheckInBaggageTransactionFormData = z.infer<typeof checkInBaggageTransactionSchema>
