import { z } from 'zod'

export const ticketPaymentSchema = z.object({
  cashRegister: z.string().min(1, 'Caisse requise'),
  description: z.string().min(1, 'Description requise'),
})

export type TicketPaymentFormData = z.infer<typeof ticketPaymentSchema>
