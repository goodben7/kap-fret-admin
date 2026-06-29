import { z } from 'zod'

export const passengerManifestSchema = z.object({
  departure: z.string().min(1, 'Départ requis'),
  destination: z.string().min(1, 'Destination requise'),
  travelDate: z.string().min(1, 'Date de voyage requise'),
})

export type PassengerManifestFormData = z.infer<typeof passengerManifestSchema>
