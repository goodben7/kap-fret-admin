import { z } from 'zod'
import { PERSON_TYPES } from '@/constants/profile'

export const profileSchema = z.object({
  label: z.string().min(2, 'Libellé requis (min. 2 caractères)'),
  personType: z.enum([
    PERSON_TYPES.SPADM,
    PERSON_TYPES.ADM,
    PERSON_TYPES.TKT,
    PERSON_TYPES.CHK,
    PERSON_TYPES.FRT,
    PERSON_TYPES.MGR,
    PERSON_TYPES.USR,
  ]),
  permission: z.array(z.string()).min(1, 'Sélectionnez au moins une permission'),
  active: z.boolean(),
})

export type ProfileFormData = z.infer<typeof profileSchema>
