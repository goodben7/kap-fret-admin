import { api } from './api'
import { extractHydraMember, extractHydraTotalItems } from '@/lib/hydra'
import { buildUserFilterParams, type UserFilters } from '@/lib/user-filters'
import type { HydraCollection } from '@/types/hydra'
import type {
  AdminUser,
  UserCreatePayload,
  UserUpdatePayload,
  UserCredentialsPayload,
  AdminAccessPayload,
} from '@/types/user'

export type { UserFilters } from '@/lib/user-filters'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export const userService = {
  async getAll(filters: UserFilters = {}) {
    const { data } = await api.get<HydraCollection<AdminUser>>('/api/users', {
      params: buildUserFilterParams(filters),
    })
    return {
      items: extractHydraMember(data).filter((u) => u.id && u.id !== 'about'),
      totalItems: extractHydraTotalItems(data),
    }
  },

  async getById(id: string) {
    const { data } = await api.get<AdminUser>(`/api/users/${id}`)
    return data
  },

  async create(payload: UserCreatePayload) {
    const { data } = await api.post<AdminUser>('/api/users', payload, { headers: JSON_HEADERS })
    return data
  },

  async update(id: string, payload: UserUpdatePayload) {
    const { data } = await api.patch<AdminUser>(`/api/users/${id}`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },

  async changeCredentials(id: string, payload: UserCredentialsPayload) {
    const { data } = await api.patch(`/api/users/${id}/credentials`, payload, {
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/merge-patch+json' },
    })
    return data
  },

  async delete(id: string) {
    await api.delete(`/api/users/${id}`)
  },

  async toggleLock(id: string) {
    const { data } = await api.post(`/api/users/${id}/lock_toggle`, {}, {
      headers: JSON_HEADERS,
    })
    return data
  },

  /** POST /api/users/{userId}/admin_access */
  async createAdminAccess(userId: string, payload: AdminAccessPayload) {
    const { data } = await api.post(`/api/users/${userId}/admin_access`, payload, {
      headers: JSON_HEADERS,
    })
    return data
  },

  /** POST /api/users/{userId}/admin_access — userId = id du bureau (holderId) */
  async createOfficeAdmin(payload: AdminAccessPayload) {
    return this.createAdminAccess(payload.holderId, payload)
  },

  async findOfficeAdmin(holderId: string) {
    const { items } = await this.getAll({
      holderId,
      holderType: 'ISSUING_OFFICE',
      personType: 'ADM',
      itemsPerPage: 5,
    })
    return items.find((u) => u.holderId === holderId && u.personType === 'ADM') ?? items[0] ?? null
  },
}
