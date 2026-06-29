import type { HydraResource } from './hydra'

export interface ProvinceCheckpointRef extends HydraResource {
  id: string
  label: string
  active: boolean
  latitude?: number
  longitude?: number
}

export interface Province extends HydraResource {
  id: string
  label: string
  code: string
  active: boolean
  createdAt?: string
  checkpoints?: ProvinceCheckpointRef[]
}

export interface ProvincePayload {
  label: string
  code: string
  active: boolean
}
