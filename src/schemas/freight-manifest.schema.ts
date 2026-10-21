import { z } from 'zod'

export const freightManifestSchema = z.object({
  departure: z.string().min(1, 'Lieu de chargement requis'),
  destination: z.string().min(1, 'Lieu de déchargement requis'),
  shipmentDate: z.string().optional(),
  flightNumber: z.string().optional(),
})

export type FreightManifestFormData = z.infer<typeof freightManifestSchema>
