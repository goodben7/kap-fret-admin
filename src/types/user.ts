import type { HydraResource } from './hydra'

export interface UserProfileRef {
  '@id': string
  '@type'?: string
  id: string
  label: string
}

export interface AdminUser extends HydraResource {
  id: string
  email: string
  phone?: string
  displayName: string
  roles: string[]
  personType?: string
  profile?: UserProfileRef | string
  holderId?: string
  holderType?: string
  deleted: boolean
  locked: boolean
  mustChangePassword?: boolean
  adminAccountCreated?: boolean
  confirmed?: boolean
  createdAt?: string
}

export interface UserCreatePayload {
  email: string
  plainPassword: string
  profile: string
  phone: string
  displayName: string
  holderId?: string
  holderType?: string
}

export interface UserUpdatePayload {
  email: string
  phone: string
  displayName: string
}

export interface UserCredentialsPayload {
  actualPassword: string
  newPassword: string
}

export interface AdminAccessPayload {
  email: string
  plainPassword: string
  profile: string
  phone: string
  displayName: string
  holderId: string
  holderType: string
}

export function getUserProfileLabel(user: AdminUser): string {
  if (!user.profile) return '—'
  if (typeof user.profile === 'string') return user.profile
  return user.profile.label ?? user.profile.id
}
