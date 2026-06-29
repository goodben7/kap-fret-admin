import { z } from 'zod'

export const checkpointSchema = z.object({
  label: z.string().min(2, 'Libellé requis'),
  active: z.boolean(),
  latitude: z.number({ message: 'Latitude requise' }),
  longitude: z.number({ message: 'Longitude requise' }),
  province: z.string().min(1, 'Province requise'),
})

export type CheckpointFormData = z.infer<typeof checkpointSchema>
