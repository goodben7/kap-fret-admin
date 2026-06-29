import { z } from 'zod'

export const ticketReportTravelDateSchema = z.object({
  travelDate: z.string().min(1, 'Date de voyage requise'),
  travelTime: z.string().min(1, 'Heure de voyage requise'),
  comment: z.string().min(3, 'Commentaire requis (min. 3 caractères)'),
})

export type TicketReportTravelDateFormData = z.infer<typeof ticketReportTravelDateSchema>
