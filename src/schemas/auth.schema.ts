import { z } from 'zod'

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email ou téléphone requis'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export type LoginFormData = z.infer<typeof loginSchema>
