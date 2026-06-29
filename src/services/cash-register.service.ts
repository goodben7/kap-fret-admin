import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { buildCashRegisterFilterParams, buildCashRegisterIssuingOfficeOnlyParams, type CashRegisterFilters } from '@/lib/cash-register-filters'
import type { HydraCollection } from '@/types/hydra'
import type {
  CashRegisterCreatePayload,
  CashRegisterPatchPayload,
  CashRegisterResource,
} from '@/types/cash-register'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export type { CashRegisterFilters } from '@/lib/cash-register-filters'

export const cashRegisterService = {
  async getAll(filters: CashRegisterFilters = {}) {
    const { data } = await api.get<HydraCollection<CashRegisterResource>>('/api/cash_registers', {
      params: buildCashRegisterFilterParams(filters),
    })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getByIssuingOffice(issuingOffice: string) {
    const { data } = await api.get<HydraCollection<CashRegisterResource>>('/api/cash_registers', {
      params: buildCashRegisterIssuingOfficeOnlyParams(issuingOffice),
    })
    return {
      items: extractHydraMember(data),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<CashRegisterResource>(`/api/cash_registers/${id}`)
    return data
  },

  async create(payload: CashRegisterCreatePayload) {
    const { data } = await api.post<CashRegisterResource>('/api/cash_registers', payload, {
      headers: JSON_HEADERS,
    })
    return data
  },

  async update(id: string, payload: CashRegisterPatchPayload) {
    const { data } = await api.patch<CashRegisterResource>(`/api/cash_registers/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },
}
