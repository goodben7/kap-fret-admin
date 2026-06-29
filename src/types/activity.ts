import type { HydraResource } from './hydra'
import type { TicketUserRef } from '@/types/ticket'

export type UserActivityCode = 'registrated' | 'admin_access_created'

export type OfficeActivityCode = 'office.created' | 'office.updated'

export type TicketActivityCode =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.cancelled'
  | 'ticket.used'
  | 'ticket.refunded'

export type CheckInActivityCode = 'checkin.created' | 'checkin.updated'

export type FreightActivityCode =
  | 'freight.created'
  | 'freight.sent'
  | 'freight.arrived'
  | 'freight.delivered'
  | 'freight.cancelled'

export type ActivityCode =
  | UserActivityCode
  | OfficeActivityCode
  | TicketActivityCode
  | CheckInActivityCode
  | FreightActivityCode

export interface Activity extends HydraResource {
  id: number | string
  activity: string
  ressourceName: string
  ressourceIdentifier: string
  user?: string
  date: string
  triggeredBy?: TicketUserRef | string
}
