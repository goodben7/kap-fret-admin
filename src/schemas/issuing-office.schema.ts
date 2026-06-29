import { z } from 'zod'

export const issuingOfficeSchema = z.object({
  code: z.string().min(2, 'Code requis'),
  name: z.string().min(2, 'Nom requis'),
  checkpoint: z.string().min(1, 'Checkpoint requis'),
  currency: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  active: z.boolean(),
})

export const officeAdminAccessSchema = z.object({
  email: z.string().email('Email invalide'),
  plainPassword: z.string().min(6, 'Mot de passe min. 6 caractères'),
  profile: z.string().min(1, 'Profil requis'),
  phone: z.string().min(1, 'Téléphone requis'),
  displayName: z.string().min(2, 'Nom affiché requis'),
})

export type IssuingOfficeFormData = z.infer<typeof issuingOfficeSchema>
export type OfficeAdminAccessFormData = z.infer<typeof officeAdminAccessSchema>
