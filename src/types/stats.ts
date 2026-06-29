import type { Currency } from '@/constants/ticket'

export type StatsPeriodPreset = 'day' | 'week' | 'month' | 'year' | 'custom'

export type StatsTypeFilter = '' | 'tickets' | 'freight' | 'finance' | 'checkIn'

export interface StatsFilters {
  startDate: string
  endDate: string
  currency?: Currency | ''
  issuingOfficeId?: string
  type?: StatsTypeFilter
}

export interface StatsSummary {
  ticketsTotal: number
  checkInsTotal: number
  freightTotal: number
  cashRegistersCount: number
  totalRevenue: number
  transactionsTotal: number
  activeUsersCount: number
  checkInRevenue: number
  freightRevenue: number
  cashBalances: Partial<Record<Currency, string>>
}

export interface StatsTickets {
  byStatus: Record<string, number>
  total: number
  revenue: number
  revenueCdf: number
  revenueUsd: number
}

export interface StatsCheckIn {
  byStatus: Record<string, number>
  total: number
  revenue: number
  revenueCdf: number
  revenueUsd: number
}

export interface StatsFreight {
  byStatus: Record<string, number>
  total: number
  revenueCdf: number
  revenueUsd: number
}

export interface StatsFinance {
  byType: Record<string, number>
  entriesCount: number
  exitsCount: number
  entriesAmount: number
  exitsAmount: number
  netAmount: number
}

export interface StatsCashRegisterItem {
  id: string
  name: string
  currency: string
  currentBalance: string
}

export interface StatsCashRegisters {
  totalsByCurrency: Partial<Record<Currency, string>>
  registers: StatsCashRegisterItem[]
}

export interface StatsTimelinePoint {
  date: string
  label: string
  tickets: number
  ticketsRevenue: number
  freight: number
  freightRevenue: number
}

export interface StatsByCurrency {
  currency: Currency
  entries: number
  exits: number
  net: number
  count: number
}

export interface StatsByIssuingOffice {
  id: string
  name: string
  count: number
  revenue: number
}

export interface AppStats {
  summary: StatsSummary
  tickets: StatsTickets
  checkIn: StatsCheckIn
  freight: StatsFreight
  finance: StatsFinance
  cashRegisters: StatsCashRegisters
  timeline: StatsTimelinePoint[]
  byCurrency: StatsByCurrency[]
  byIssuingOffice: StatsByIssuingOffice[]
}

/** Réponse brute API /api/stats (tableaux member) */
export interface StatsApiResponse {
  '@type'?: string
  summary?: { member?: unknown[] }
  tickets?: { member?: unknown[] }
  checkIn?: { member?: unknown[] }
  freight?: { member?: unknown[] }
  finance?: { member?: unknown[] }
  cashRegisters?: { member?: unknown[] }
  timeline?: { member?: unknown[] }
  byCurrency?: { member?: unknown[] }
  byIssuingOffice?: { member?: unknown[] }
}

export interface StatsComparison {
  current: AppStats
  previous: AppStats | null
}

export interface StatsRevenueByCurrency {
  cdf: number
  usd: number
}
