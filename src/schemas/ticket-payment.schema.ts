import { z } from 'zod'
import { CURRENCY } from '@/constants/ticket'

export const ticketPaymentSchema = z.object({
  cashRegister: z.string().min(1, 'Caisse requise'),
  paymentCurrency: z.enum([CURRENCY.CDF, CURRENCY.USD], { message: 'Devise de paiement requise' }),
  description: z.string().min(1, 'Description requise'),
})

export type TicketPaymentFormData = z.infer<typeof ticketPaymentSchema>
