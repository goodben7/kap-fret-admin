import { z } from 'zod'

export const provinceSchema = z.object({
  label: z.string().min(2, 'Libellé requis'),
  code: z.string().min(2, 'Code requis').max(10, 'Code max. 10 caractères'),
  active: z.boolean(),
})

export type ProvinceFormData = z.infer<typeof provinceSchema>
