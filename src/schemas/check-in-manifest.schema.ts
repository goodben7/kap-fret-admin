import { z } from 'zod'

export const checkInManifestSchema = z.object({
  departure: z.string().min(1, 'Départ requis'),
  destination: z.string().min(1, 'Destination requise'),
  travelDate: z.string().min(1, 'Date du vol requise'),
  flightNumber: z.string().optional(),
})

export type CheckInManifestFormData = z.infer<typeof checkInManifestSchema>
