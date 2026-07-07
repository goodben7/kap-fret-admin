import { CURRENCY, normalizeCurrency, type Currency } from '@/constants/ticket'
import { FREIGHT_STATUS_LABELS, type FreightStatus } from '@/constants/freight'
import {
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from '@/constants/ticket'
import { getTodayTravelDateInput } from '@/lib/ticket'
import { convertAmountBetweenCurrencyCodes } from '@/lib/exchange-rate'
import { formatMoney } from '@/lib/utils'
import type {
  AppStats,
  StatsApiResponse,
  StatsByCurrency,
  StatsByIssuingOffice,
  StatsCashRegisterItem,
  StatsCashRegisters,
  StatsCheckIn,
  StatsFinance,
  StatsFreight,
  StatsPeriodPreset,
  StatsSummary,
  StatsTickets,
  StatsTimelinePoint,
  StatsFilters,
  StatsRevenueByCurrency,
} from '@/types/stats'
import type { ExchangeRateResource } from '@/types/exchange-rate'

export const CHART_COLORS = {
  primary: '#F57C00',
  navy: '#0B213D',
  usd: '#3B82F6',
  cdf: '#10B981',
  ticket: '#6366F1',
  freight: '#F57C00',
  checkIn: '#22C55E',
  entry: '#22C55E',
  exit: '#EF4444',
  muted: '#94A3B8',
} as const

export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.navy,
  CHART_COLORS.usd,
  CHART_COLORS.cdf,
  CHART_COLORS.ticket,
  CHART_COLORS.checkIn,
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F59E0B',
]

function extractMember<T>(section: { member?: T[] } | T[] | undefined): T[] {
  if (!section) return []
  if (Array.isArray(section)) return section
  return section.member ?? []
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStatusRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value)) {
    result[key] = toNumber(raw)
  }
  return result
}

function parseCurrencyBalances(value: unknown): Partial<Record<Currency, string>> {
  if (!isRecord(value)) return {}
  const result: Partial<Record<Currency, string>> = {}
  for (const code of [CURRENCY.USD, CURRENCY.CDF] as const) {
    const raw = value[code]
    if (typeof raw === 'string' || typeof raw === 'number') {
      result[code] = String(raw)
    }
  }
  return result
}

function parseSummary(member: unknown[]): StatsSummary {
  return {
    ticketsTotal: toNumber(member[0]),
    checkInsTotal: toNumber(member[1]),
    freightTotal: toNumber(member[2]),
    cashRegistersCount: toNumber(member[3]),
    totalRevenue: toNumber(member[4]),
    transactionsTotal: toNumber(member[5]),
    activeUsersCount: toNumber(member[6]),
    checkInRevenue: toNumber(member[7]),
    freightRevenue: toNumber(member[8]),
    cashBalances: parseCurrencyBalances(member[9]),
  }
}

function parseTickets(member: unknown[]): StatsTickets {
  const revenue = toNumber(member[2])
  return {
    byStatus: parseStatusRecord(member[0]),
    total: toNumber(member[1]),
    revenue,
    revenueCdf: 0,
    revenueUsd: revenue,
  }
}

function parseCheckIn(member: unknown[]): StatsCheckIn {
  const revenue = toNumber(member[2])
  return {
    byStatus: parseStatusRecord(member[0]),
    total: toNumber(member[1]),
    revenue,
    revenueCdf: 0,
    revenueUsd: revenue,
  }
}

function parseFreight(member: unknown[]): StatsFreight {
  return {
    byStatus: parseStatusRecord(member[0]),
    total: toNumber(member[1]),
    revenueCdf: toNumber(member[2]),
    revenueUsd: toNumber(member[3]),
  }
}

function parseFinance(member: unknown[]): StatsFinance {
  const flow = parseStatusRecord(member[0])
  const byCategory = parseStatusRecord(member[1])
  return {
    entriesCount: flow.ENTRY ?? 0,
    exitsCount: flow.EXIT ?? 0,
    byType: byCategory,
    entriesAmount: toNumber(member[2]),
    exitsAmount: toNumber(member[3]),
    netAmount: toNumber(member[4]),
  }
}

function parseCashRegisters(member: unknown[]): StatsCashRegisters {
  const totalsByCurrency = parseCurrencyBalances(member[0])
  const rawList = member[1]
  const registers: StatsCashRegisterItem[] = []

  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (!isRecord(item)) continue
      registers.push({
        id: String(item.id ?? ''),
        name: String(item.name ?? '—'),
        currentBalanceCDF: String(item.currentBalanceCDF ?? item.currentBalance ?? '0'),
        currentBalanceUSD: String(item.currentBalanceUSD ?? '0'),
      })
    }
  }

  return { totalsByCurrency, registers }
}

function formatTimelineLabel(date: string): string {
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [year, month] = date.split('-')
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const index = Number(month) - 1
    return index >= 0 && index < 12 ? `${monthNames[index]} ${year}` : date
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [, month, day] = date.split('-')
    return `${day}/${month}`
  }
  return date
}

function parseTimeline(member: unknown[]): StatsTimelinePoint[] {
  return member
    .filter(isRecord)
    .map((item) => ({
      date: String(item.date ?? ''),
      label: formatTimelineLabel(String(item.date ?? '')),
      tickets: toNumber(item.tickets),
      ticketsRevenue: toNumber(item.ticketsRevenue),
      freight: toNumber(item.freight),
      freightRevenue: toNumber(item.freightRevenue),
    }))
}

function parseByCurrency(member: unknown[]): StatsByCurrency[] {
  return member
    .filter(isRecord)
    .map((item) => ({
      currency: normalizeCurrency(item.currency),
      entries: toNumber(item.entries),
      exits: toNumber(item.exits),
      net: toNumber(item.net),
      count: toNumber(item.count),
    }))
}

function parseByIssuingOffice(member: unknown[]): StatsByIssuingOffice[] {
  return member
    .filter(isRecord)
    .map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? '—'),
      count: toNumber(item.count),
      revenue: toNumber(item.revenue),
    }))
}

export function parseStatsResponse(data: StatsApiResponse): AppStats {
  return {
    summary: parseSummary(extractMember(data.summary)),
    tickets: parseTickets(extractMember(data.tickets)),
    checkIn: parseCheckIn(extractMember(data.checkIn)),
    freight: parseFreight(extractMember(data.freight)),
    finance: parseFinance(extractMember(data.finance)),
    cashRegisters: parseCashRegisters(extractMember(data.cashRegisters)),
    timeline: parseTimeline(extractMember(data.timeline)),
    byCurrency: parseByCurrency(extractMember(data.byCurrency)),
    byIssuingOffice: parseByIssuingOffice(extractMember(data.byIssuingOffice)),
  }
}

export function getTodayDateInput(): string {
  return getTodayTravelDateInput()
}

export function serializeStatsFilters(filters: StatsFilters): readonly string[] {
  return [
    filters.startDate,
    filters.endDate,
    filters.currency ?? '',
    filters.issuingOfficeId ?? '',
    filters.type ?? '',
  ]
}

function isTimelinePointInRange(pointDate: string, startDate: string, endDate: string): boolean {
  if (/^\d{4}-\d{2}$/.test(pointDate)) {
    const monthStart = `${pointDate}-01`
    const [yearStr, monthStr] = pointDate.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!Number.isFinite(year) || !Number.isFinite(month)) return false
    const lastDay = new Date(year, month, 0).getDate()
    const monthEnd = `${pointDate}-${String(lastDay).padStart(2, '0')}`
    return monthEnd >= startDate && monthStart <= endDate
  }
  return pointDate >= startDate && pointDate <= endDate
}

/** Filtres locaux sur les sections où l'API stats ne filtre pas encore. */
export function applyStatsClientFilters(stats: AppStats, filters: StatsFilters): AppStats {
  const result: AppStats = {
    ...stats,
    timeline: stats.timeline.filter((point) =>
      isTimelinePointInRange(point.date, filters.startDate, filters.endDate),
    ),
  }

  if (filters.currency) {
    const currency = filters.currency
    const currencyRow = stats.byCurrency.find((row) => row.currency === currency)
    result.byCurrency = stats.byCurrency.filter((row) => row.currency === currency)
    result.cashRegisters = {
      totalsByCurrency: {
        [currency]: stats.cashRegisters.totalsByCurrency[currency] ?? '0',
      },
      registers: stats.cashRegisters.registers,
    }
    if (currencyRow) {
      result.finance = {
        ...result.finance,
        entriesAmount: currencyRow.entries,
        exitsAmount: currencyRow.exits,
        netAmount: currencyRow.net,
      }
    }
    result.summary = {
      ...result.summary,
      totalRevenue: computeTotalRevenue(result, currency),
      cashBalances: {
        [currency]: stats.cashRegisters.totalsByCurrency[currency] ?? '0',
      },
    }
  }

  if (filters.issuingOfficeId?.trim()) {
    const officeId = filters.issuingOfficeId.trim()
    result.byIssuingOffice = stats.byIssuingOffice.filter((office) => office.id === officeId)
  }

  return result
}

export function getStartOfMonthInput(reference = new Date()): string {
  const year = reference.getFullYear()
  const month = String(reference.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

export function getStartOfYearInput(reference = new Date()): string {
  return `${reference.getFullYear()}-01-01`
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function resolveStatsDateRange(preset: StatsPeriodPreset, custom?: {
  startDate?: string
  endDate?: string
}): { startDate: string; endDate: string } {
  const today = getTodayDateInput()

  switch (preset) {
    case 'day':
      return { startDate: today, endDate: today }
    case 'week':
      return { startDate: addDays(today, -6), endDate: today }
    case 'month':
      return { startDate: getStartOfMonthInput(), endDate: today }
    case 'year':
      return { startDate: getStartOfYearInput(), endDate: today }
    case 'custom':
    default:
      return {
        startDate: custom?.startDate?.trim() || getStartOfMonthInput(),
        endDate: custom?.endDate?.trim() || today,
      }
  }
}

export function getPreviousPeriodRange(startDate: string, endDate: string): {
  startDate: string
  endDate: string
} {
  const startMs = Date.parse(`${startDate}T12:00:00`)
  const endMs = Date.parse(`${endDate}T12:00:00`)
  const durationDays = Math.max(0, Math.round((endMs - startMs) / 86_400_000))
  const previousEnd = addDays(startDate, -1)
  const previousStart = addDays(previousEnd, -durationDays)
  return { startDate: previousStart, endDate: previousEnd }
}

export function computeVariationPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

export function formatVariationPercent(value: number | null): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} %`
}

export function statusEntries(
  byStatus: Record<string, number>,
  labels: Record<string, string>,
): { key: string; label: string; value: number }[] {
  return Object.entries(byStatus)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value,
    }))
}

export function ticketStatusChartData(byStatus: Record<string, number>) {
  return statusEntries(byStatus, TICKET_STATUS_LABELS as Record<TicketStatus, string>)
}

export function freightStatusChartData(byStatus: Record<string, number>) {
  return statusEntries(byStatus, FREIGHT_STATUS_LABELS as Record<FreightStatus, string>)
}

export function financeCategoryChartData(byType: Record<string, number>) {
  const labels: Record<string, string> = {
    CHECKIN: 'Check-in',
    FREIGHT: 'Fret',
    TICKET: 'Billet',
    MANUAL: 'Manuel',
  }
  return statusEntries(byType, labels)
}

export function sumCashBalances(balances: Partial<Record<Currency, string>>): number {
  return Object.values(balances).reduce((sum, value) => sum + (parseFloat(value ?? '') || 0), 0)
}

export function computeRevenueBreakdown(stats: AppStats): StatsRevenueByCurrency {
  return {
    cdf:
      stats.tickets.revenueCdf
      + stats.checkIn.revenueCdf
      + stats.freight.revenueCdf,
    usd:
      stats.tickets.revenueUsd
      + stats.checkIn.revenueUsd
      + stats.freight.revenueUsd,
  }
}

export function computeTotalRevenue(stats: AppStats, currency?: Currency): number {
  const breakdown = computeRevenueBreakdown(stats)

  if (currency === CURRENCY.USD) return breakdown.usd
  if (currency === CURRENCY.CDF) return breakdown.cdf

  return breakdown.cdf + breakdown.usd
}

export function computeConsolidatedRevenueCdf(
  breakdown: StatsRevenueByCurrency,
  exchangeRates: ExchangeRateResource[],
): { total: number; convertedUsd: number | null } {
  const convertedUsd = breakdown.usd > 0
    ? convertAmountBetweenCurrencyCodes(breakdown.usd, CURRENCY.USD, CURRENCY.CDF, exchangeRates)
    : 0

  return {
    total: breakdown.cdf + (convertedUsd ?? 0),
    convertedUsd,
  }
}

export function formatTotalRevenueAllCurrencies(
  breakdown: StatsRevenueByCurrency,
  exchangeRates: ExchangeRateResource[],
): { value: string; subValue?: string; consolidatedCdf: number | null } {
  const parts: string[] = []
  if (breakdown.usd > 0) parts.push(formatMoney(breakdown.usd, CURRENCY.USD))
  if (breakdown.cdf > 0) parts.push(formatMoney(breakdown.cdf, CURRENCY.CDF))

  const value = parts.length > 0 ? parts.join(' · ') : formatMoney(0, CURRENCY.USD)

  if (breakdown.usd <= 0) {
    return { value, consolidatedCdf: breakdown.cdf > 0 ? breakdown.cdf : null }
  }

  const { total, convertedUsd } = computeConsolidatedRevenueCdf(breakdown, exchangeRates)

  if (convertedUsd == null) {
    return {
      value,
      subValue: 'Consolidation CDF indisponible (taux USD → CDF manquant)',
      consolidatedCdf: null,
    }
  }

  return {
    value,
    subValue: `Total ≈ ${formatMoney(total, CURRENCY.CDF)} (USD converti au taux en vigueur)`,
    consolidatedCdf: total,
  }
}

export function formatFreightRevenue(
  freight: AppStats['freight'],
  currency?: Currency,
): string {
  if (currency === CURRENCY.USD) {
    return formatMoney(freight.revenueUsd, CURRENCY.USD)
  }
  if (currency === CURRENCY.CDF) {
    return formatMoney(freight.revenueCdf, CURRENCY.CDF)
  }
  return formatStatsRevenueByCurrency(freight.revenueCdf, freight.revenueUsd)
}

export function formatStatsRevenueByCurrency(
  revenueCdf: number,
  revenueUsd: number,
  currency?: Currency,
): string {
  if (currency === CURRENCY.USD) return formatMoney(revenueUsd, CURRENCY.USD)
  if (currency === CURRENCY.CDF) return formatMoney(revenueCdf, CURRENCY.CDF)

  const parts: string[] = []
  if (revenueUsd > 0) parts.push(formatMoney(revenueUsd, CURRENCY.USD))
  if (revenueCdf > 0) parts.push(formatMoney(revenueCdf, CURRENCY.CDF))
  return parts.length > 0 ? parts.join(' · ') : formatMoney(0, CURRENCY.USD)
}
