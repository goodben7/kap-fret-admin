import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { buildCashTransactionFilterParams, type CashTransactionFilters } from '@/lib/cash-transaction-filters'
import { sortCashTransactionsByNewestFirst } from '@/lib/cash-transaction'
import type { HydraCollection } from '@/types/hydra'
import type {
  CashTransaction,
  CashTransactionCreatePayload,
  PreviewConversionOutput,
  PreviewConversionPayload,
} from '@/types/cash-transaction'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

/** Au-delà de cette limite, on s'appuie sur le tri API + pagination serveur */
const CLIENT_SORT_MAX_ITEMS = 500

export type { CashTransactionFilters } from '@/lib/cash-transaction-filters'

async function fetchCashTransactionCollection(
  filters: CashTransactionFilters,
): Promise<HydraCollection<CashTransaction>> {
  const params = buildCashTransactionFilterParams(filters)
  const { data } = await api.get<HydraCollection<CashTransaction>>('/api/cash_transactions', { params })
  return data
}

function mapAndSortCashTransactions(data: HydraCollection<CashTransaction>): CashTransaction[] {
  return sortCashTransactionsByNewestFirst(extractHydraMember(data))
}

export const cashTransactionService = {
  async getAll(filters: CashTransactionFilters = {}) {
    const page = filters.page ?? 1
    const itemsPerPage = filters.itemsPerPage ?? 20

    const probeData = await fetchCashTransactionCollection({
      ...filters,
      page: 1,
      itemsPerPage,
    })
    const totalItems = extractHydraTotalItems(probeData)

    let sortedItems: CashTransaction[]

    if (totalItems > itemsPerPage && totalItems <= CLIENT_SORT_MAX_ITEMS) {
      const fullData = await fetchCashTransactionCollection({
        ...filters,
        page: 1,
        itemsPerPage: totalItems,
      })
      sortedItems = mapAndSortCashTransactions(fullData)
    } else {
      sortedItems = mapAndSortCashTransactions(probeData)
    }

    const start = (page - 1) * itemsPerPage
    return {
      items: sortedItems.slice(start, start + itemsPerPage),
      totalItems,
    }
  },

  async getAllForReport(filters: Pick<CashTransactionFilters, 'cashRegister'>): Promise<CashTransaction[]> {
    const probeData = await fetchCashTransactionCollection({
      ...filters,
      page: 1,
      itemsPerPage: 1,
    })
    const totalItems = extractHydraTotalItems(probeData)
    if (totalItems === 0) return []

    const fullData = await fetchCashTransactionCollection({
      ...filters,
      page: 1,
      itemsPerPage: totalItems,
    })
    return extractHydraMember(fullData)
  },

  async getById(id: string) {
    const { data } = await api.get<CashTransaction>(`/api/cash_transactions/${id}`)
    return data
  },

  async create(payload: CashTransactionCreatePayload) {
    const { data } = await api.post<CashTransaction>('/api/cash_transactions', payload, {
      headers: JSON_HEADERS,
    })
    return data
  },

  async validate(id: string) {
    const { data } = await api.post<CashTransaction>(`/api/cash_transactions/${id}/validate`, {}, {
      headers: JSON_HEADERS,
    })
    return data
  },

  async previewConversion(payload: PreviewConversionPayload) {
    const { data } = await api.post<PreviewConversionOutput>(
      '/api/cash_transactions/preview-conversion',
      payload,
      { headers: JSON_HEADERS },
    )
    return data
  },
}
