import type { HydraResource } from './hydra'
export type { Ticket } from './ticket'

export type { IssuingOffice } from './issuing-office'
import type { IssuingOffice } from './issuing-office'

export type { Province } from './province'
export type { Checkpoint } from './checkpoint'

export interface User extends HydraResource {
  id: string | number
  email?: string
  phone?: string
  displayName?: string
  firstName?: string
  lastName?: string
  roles: string[]
  holderType?: string
  holder?: string | IssuingOffice
  active?: boolean
}

export type { CheckIn } from './check-in'

export type { FreightShipment, FreightPackage } from './freight-shipment'

export interface DashboardStats {
  ticketsToday: number
  checkInsToday: number
  shipmentsToday: number
  revenueToday: number
}
