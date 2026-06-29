import { z } from 'zod'

export const freightDeliveryPaymentSchema = z.object({
  cashRegister: z.string().min(1, 'Caisse requise'),
  amount: z.string().min(1, 'Montant requis'),
  description: z.string().min(1, 'Description requise'),
})

export type FreightDeliveryPaymentFormData = z.infer<typeof freightDeliveryPaymentSchema>
