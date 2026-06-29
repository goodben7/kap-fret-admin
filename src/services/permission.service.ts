import { api } from './api'
import { extractHydraMember } from '@/lib/hydra'
import type { HydraCollection } from '@/types/hydra'
import type { Permission } from '@/types/profile'

type PermissionItem = string | { code?: string; name?: string; label?: string; '@id'?: string }

function normalizePermission(item: PermissionItem): Permission | null {
  if (typeof item === 'string') {
    return { code: item, label: formatPermissionLabel(item) }
  }
  const code = item.code ?? item.name ?? item['@id']?.split('/').pop()
  if (!code) return null
  return {
    code,
    label: item.label ?? formatPermissionLabel(code),
  }
}

function formatPermissionLabel(code: string): string {
  return code
    .replace(/^ROLE_/, '')
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

export const permissionService = {
  async getAll(): Promise<Permission[]> {
    const { data } = await api.get<HydraCollection<PermissionItem> | PermissionItem[]>('/api/permissions')

    const items = Array.isArray(data) ? data : extractHydraMember(data)

    return items
      .map(normalizePermission)
      .filter((p): p is Permission => p !== null)
      .sort((a, b) => a.code.localeCompare(b.code))
  },
}
