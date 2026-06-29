import type { HydraResource } from './hydra'
import type { Province } from './province'

export interface Checkpoint extends HydraResource {
  id: string
  label: string
  active: boolean
  latitude: number
  longitude: number
  province: string | Province
}

export interface CheckpointPayload {
  label: string
  active: boolean
  latitude: number
  longitude: number
  province: string
}
