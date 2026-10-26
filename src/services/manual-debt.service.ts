import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import type {
  ManualDebt,
  ManualDebtCreatePayload,
  ManualDebtPaymentPayload,
} from '@/types/manual-debt'
import type { ManualDebtStatus } from '@/constants/manual-debt'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export interface ManualDebtFilters {
  page?: number
  itemsPerPage?: number
  status?: ManualDebtStatus | ManualDebtStatus[]
  debtorName?: string
  currency?: string
  issuingOffice?: string
  order?: Record<string, 'asc' | 'desc'>
}

function buildParams(filters: ManualDebtFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    itemsPerPage: filters.itemsPerPage ?? 50,
  }
  if (filters.debtorName?.trim()) params.debtorName = filters.debtorName.trim()
  if (filters.currency) params.currency = filters.currency
  if (filters.issuingOffice) params.issuingOffice = filters.issuingOffice
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    statuses.forEach((s, i) => {
      params[`status[${i}]`] = s
    })
  }
  if (filters.order) {
    for (const [field, dir] of Object.entries(filters.order)) {
      params[`order[${field}]`] = dir
    }
  }
  return params
}

export const manualDebtService = {
  async getAll(filters: ManualDebtFilters = {}) {
    const params = buildParams(filters)
    const { data } = await api.get<HydraCollection<ManualDebt>>('/api/manual_debts', { params })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<ManualDebt>(`/api/manual_debts/${id}`, {
      headers: { Accept: 'application/json' },
    })
    return data
  },

  async create(payload: ManualDebtCreatePayload) {
    const { data } = await api.post<ManualDebt>('/api/manual_debts', payload, {
      headers: JSON_HEADERS,
    })
    return data
  },

  async pay(id: string, payload: ManualDebtPaymentPayload) {
    const { data } = await api.post<ManualDebt>(`/api/manual_debts/${id}/payment`, payload, {
      headers: JSON_HEADERS,
    })
    return data
  },
}
