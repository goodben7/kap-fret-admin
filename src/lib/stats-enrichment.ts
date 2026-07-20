import { api } from '@/services/api'
import { extractHydraMember, extractHydraTotalItems, toIri } from '@/lib/hydra'
import { addDays, applyStatsClientFilters } from '@/lib/stats'
import { getTicketTotal } from '@/lib/ticket'
import { CURRENCY, normalizeCurrency } from '@/constants/ticket'
import { CASH_TRANSACTION_TYPE } from '@/constants/cash-transaction'
import { getCashTransactionCurrencyCode } from '@/lib/cash-transaction'
import type { HydraCollection } from '@/types/hydra'
import type { AppStats, StatsFilters, StatsRevenueByCurrency } from '@/types/stats'
import type { Ticket } from '@/types/ticket'
import type { CheckIn } from '@/types/check-in'
import type { FreightShipment } from '@/types/freight-shipment'
import type { CashTransaction } from '@/types/cash-transaction'

const MAX_ITEMS_FOR_SUM = 2000

function appendDateRangeParams(
  params: Record<string, string | number>,
  field: string,
  startDate: string,
  endDate: string,
) {
  params[`${field}[after]`] = `${startDate}T00:00:00`
  params[`${field}[before]`] = `${addDays(endDate, 1)}T00:00:00`
}

async function fetchAllItems<T>(
  path: string,
  baseParams: Record<string, string | number>,
): Promise<{ items: T[]; totalItems: number }> {
  const probe = await api.get<HydraCollection<T>>(path, {
    params: { ...baseParams, page: 1, itemsPerPage: 1 },
  })
  const totalItems = extractHydraTotalItems(probe.data)
  if (totalItems === 0) return { items: [], totalItems: 0 }

  const itemsPerPage = Math.min(totalItems, MAX_ITEMS_FOR_SUM)
  const { data } = await api.get<HydraCollection<T>>(path, {
    params: { ...baseParams, page: 1, itemsPerPage },
  })
  return {
    items: extractHydraMember(data),
    totalItems,
  }
}

function isDateInRange(isoDate: string | undefined, startDate: string, endDate: string): boolean {
  if (!isoDate) return false
  const day = isoDate.slice(0, 10)
  return day >= startDate && day <= endDate
}

/** Filtre par date côté API, puis repli client si le DateFilter ne renvoie rien. */
async function fetchItemsInDateRange<T>(
  path: string,
  baseParams: Record<string, string | number>,
  startDate: string,
  endDate: string,
  dateField: string,
  getDateValue: (item: T) => string | undefined,
): Promise<{ items: T[]; totalItems: number }> {
  const params = { ...baseParams }
  appendDateRangeParams(params, dateField, startDate, endDate)
  const filtered = await fetchAllItems<T>(path, params)
  if (filtered.totalItems > 0) return filtered

  const all = await fetchAllItems<T>(path, baseParams)
  const items = all.items.filter((item) => isDateInRange(getDateValue(item), startDate, endDate))
  return { items, totalItems: items.length }
}

function sumTicketRevenueByCurrency(tickets: Ticket[]): StatsRevenueByCurrency {
  let cdf = 0
  let usd = 0
  for (const ticket of tickets) {
    const amount = getTicketTotal(ticket)
    const currency = normalizeCurrency(ticket.currency)
    if (currency === CURRENCY.CDF) cdf += amount
    else usd += amount
  }
  return { cdf, usd }
}

function sumCheckInRevenueByCurrency(checkIns: CheckIn[]): StatsRevenueByCurrency {
  let cdf = 0
  let usd = 0
  for (const checkIn of checkIns) {
    const amount = parseFloat(checkIn.netToPay) || 0
    const currency = normalizeCurrency(checkIn.paymentCurrency ?? checkIn.currency)
    if (currency === CURRENCY.CDF) cdf += amount
    else usd += amount
  }
  return { cdf, usd }
}

function sumFreightPaid(shipments: FreightShipment[]): { cdf: number; usd: number } {
  let cdf = 0
  let usd = 0
  for (const shipment of shipments) {
    const paid = parseFloat(shipment.paidAmount) || 0
    const currency = normalizeCurrency(shipment.currency)
    if (currency === CURRENCY.CDF) cdf += paid
    else usd += paid
  }
  return { cdf, usd }
}

function sumCashTransactions(transactions: CashTransaction[], currencyFilter?: string) {
  let entries = 0
  let exits = 0
  let entriesAmount = 0
  let exitsAmount = 0
  const byCurrencyMap = new Map<string, { entries: number; exits: number; net: number; count: number }>()

  for (const tx of transactions) {
    const amountCode = getCashTransactionCurrencyCode(tx.currency)
    const txCode = getCashTransactionCurrencyCode(tx.transactionCurrency)
    const code = txCode ?? amountCode ?? CURRENCY.USD
    if (currencyFilter && code !== currencyFilter) continue

    const amount = txCode
      ? parseFloat(tx.transactionAmount) || 0
      : parseFloat(tx.amount) || 0

    const bucket = byCurrencyMap.get(code) ?? { entries: 0, exits: 0, net: 0, count: 0 }
    bucket.count += 1

    if (tx.type === CASH_TRANSACTION_TYPE.ENTRY) {
      entries += 1
      entriesAmount += amount
      bucket.entries += amount
      bucket.net += amount
    } else {
      exits += 1
      exitsAmount += amount
      bucket.exits += amount
      bucket.net -= amount
    }
    byCurrencyMap.set(code, bucket)
  }

  return {
    entries,
    exits,
    entriesAmount,
    exitsAmount,
    netAmount: entriesAmount - exitsAmount,
    byCurrency: Array.from(byCurrencyMap.entries()).map(([currency, row]) => ({
      currency: normalizeCurrency(currency),
      entries: row.entries,
      exits: row.exits,
      net: row.net,
      count: row.count,
    })),
  }
}

function countFreightByStatus(shipments: FreightShipment[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const shipment of shipments) {
    counts[shipment.status] = (counts[shipment.status] ?? 0) + 1
  }
  return counts
}

function countTicketsByStatus(tickets: Ticket[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const ticket of tickets) {
    counts[ticket.status] = (counts[ticket.status] ?? 0) + 1
  }
  return counts
}

function countCheckInsByStatus(checkIns: CheckIn[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const checkIn of checkIns) {
    const status = checkIn.status || 'CREATED'
    counts[status] = (counts[status] ?? 0) + 1
  }
  return counts
}

function shouldEnrichTickets(type?: StatsFilters['type']) {
  return !type || type === 'tickets'
}

function shouldEnrichCheckIn(type?: StatsFilters['type']) {
  return !type || type === 'checkIn'
}

function shouldEnrichFreight(type?: StatsFilters['type']) {
  return !type || type === 'freight'
}

function shouldEnrichFinance(type?: StatsFilters['type']) {
  return !type || type === 'finance'
}

/** Recalcule les agrégats via les APIs métier quand /api/stats ignore les filtres. */
export async function enrichStatsWithEntityFilters(
  stats: AppStats,
  filters: StatsFilters,
): Promise<AppStats> {
  const enriched: AppStats = { ...stats }
  const currency = filters.currency || undefined
  const issuingOfficeIri = filters.issuingOfficeId?.trim()
    ? toIri('issuing_offices', filters.issuingOfficeId.trim())
    : undefined

  const commonParams: Record<string, string | number> = {}
  if (currency) commonParams.currency = currency
  if (issuingOfficeIri) commonParams.issuingOffice = issuingOfficeIri

  const tasks: Promise<void>[] = []

  if (shouldEnrichTickets(filters.type)) {
    tasks.push((async () => {
      const { items, totalItems } = await fetchItemsInDateRange<Ticket>(
        '/api/tickets',
        commonParams,
        filters.startDate,
        filters.endDate,
        'createdAt',
        (ticket) => ticket.createdAt,
      )
      const ticketRevenue = sumTicketRevenueByCurrency(items)
      enriched.tickets = {
        byStatus: countTicketsByStatus(items),
        total: totalItems,
        revenue: ticketRevenue.cdf + ticketRevenue.usd,
        revenueCdf: ticketRevenue.cdf,
        revenueUsd: ticketRevenue.usd,
      }
    })())
  }

  if (shouldEnrichCheckIn(filters.type)) {
    tasks.push((async () => {
      const { items, totalItems } = await fetchItemsInDateRange<CheckIn>(
        '/api/check_ins',
        commonParams,
        filters.startDate,
        filters.endDate,
        'createdAt',
        (checkIn) => checkIn.createdAt,
      )
      const checkInRevenue = sumCheckInRevenueByCurrency(items)
      enriched.checkIn = {
        byStatus: countCheckInsByStatus(items),
        total: totalItems,
        totalWeight: items.reduce((sum, item) => sum + (parseFloat(item.checkInWeight) || 0), 0),
        revenue: checkInRevenue.cdf + checkInRevenue.usd,
        revenueCdf: checkInRevenue.cdf,
        revenueUsd: checkInRevenue.usd,
      }
    })())
  }

  if (shouldEnrichFreight(filters.type)) {
    tasks.push((async () => {
      const { items, totalItems } = await fetchItemsInDateRange<FreightShipment>(
        '/api/freight_shipments',
        commonParams,
        filters.startDate,
        filters.endDate,
        'createdAt',
        (shipment) => shipment.createdAt,
      )
      const paid = sumFreightPaid(items)
      enriched.freight = {
        byStatus: countFreightByStatus(items),
        total: totalItems,
        revenue: paid.cdf + paid.usd,
        totalWeight: items.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0),
        revenueCdf: paid.cdf,
        revenueUsd: paid.usd,
      }
    })())
  }

  if (shouldEnrichFinance(filters.type)) {
    tasks.push((async () => {
      const params: Record<string, string | number> = {}
      appendDateRangeParams(params, 'transactionDate', filters.startDate, filters.endDate)
      if (issuingOfficeIri) params.issuingOffice = issuingOfficeIri
      const { items, totalItems } = await fetchAllItems<CashTransaction>('/api/cash_transactions', params)
      const totals = sumCashTransactions(items, currency)
      enriched.finance = {
        ...enriched.finance,
        entriesCount: totals.entries,
        exitsCount: totals.exits,
        entriesAmount: totals.entriesAmount,
        exitsAmount: totals.exitsAmount,
        netAmount: totals.netAmount,
      }
      if (totals.byCurrency.length > 0) {
        enriched.byCurrency = totals.byCurrency
      }
      enriched.summary = {
        ...enriched.summary,
        transactionsTotal: totalItems,
      }
    })())
  }

  await Promise.all(tasks)

  enriched.summary = {
    ...enriched.summary,
    ticketsTotal: enriched.tickets.total,
    checkInsTotal: enriched.checkIn.total,
    freightTotal: enriched.freight.total,
    checkInRevenue: enriched.checkIn.revenue,
    freightRevenue: enriched.freight.revenueCdf + enriched.freight.revenueUsd,
    cashRegistersCount: enriched.cashRegisters.registers.filter((r) => r.active !== false).length,
    cashBalances: Object.keys(enriched.summary.cashBalances).length > 0
      ? enriched.summary.cashBalances
      : { ...enriched.cashRegisters.totalsByCurrency },
    totalRevenue:
      enriched.tickets.revenueCdf
      + enriched.tickets.revenueUsd
      + enriched.checkIn.revenueCdf
      + enriched.checkIn.revenueUsd
      + enriched.freight.revenueCdf
      + enriched.freight.revenueUsd,
  }

  return applyStatsClientFilters(enriched, filters)
}
