import type { HydraResource } from '@/types/hydra'
import type { PersonType } from '@/constants/profile'

export interface Profile extends HydraResource {
  id: string
  label: string
  personType: PersonType | string
  permission: string[]
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Permission {
  code: string
  label?: string
}
