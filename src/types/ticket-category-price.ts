import type { HydraResource } from './hydra'
import type { TicketCategory } from '@/constants/ticket'

export interface TicketCategoryPrice extends HydraResource {
  id: string
  category: TicketCategory
  basePrice: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TicketCategoryPriceCreatePayload {
  category: TicketCategory
  basePrice: string
  active?: boolean
}

export interface TicketCategoryPricePatchPayload {
  basePrice: string
  active?: boolean
}
