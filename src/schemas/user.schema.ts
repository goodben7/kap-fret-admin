import { z } from 'zod'

export const userCreateSchema = z.object({
  email: z.string().email('Email invalide'),
  plainPassword: z.string().min(6, 'Mot de passe min. 6 caractères'),
  profile: z.string().min(1, 'Profil requis'),
  phone: z.string().min(1, 'Téléphone requis'),
  displayName: z.string().min(2, 'Nom affiché requis'),
  holderId: z.string().optional(),
})

export const userUpdateSchema = z.object({
  email: z.string().email('Email invalide'),
  phone: z.string().min(1, 'Téléphone requis'),
  displayName: z.string().min(2, 'Nom affiché requis'),
})

export const userCredentialsSchema = z.object({
  actualPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(6, 'Nouveau mot de passe min. 6 caractères'),
})

export type UserCreateFormData = z.infer<typeof userCreateSchema>
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>
export type UserCredentialsFormData = z.infer<typeof userCredentialsSchema>
