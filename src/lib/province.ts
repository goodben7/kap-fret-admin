import { extractIri, extractResourceId } from '@/lib/hydra'
import type { Province } from '@/types/province'

export function getProvinceOptionLabel(province: Pick<Province, 'label' | 'code'>): string {
  return `${province.label} (${province.code})`
}

export function getProvinceId(province: string | Province | undefined): string | null {
  if (!province) return null
  if (typeof province === 'object') return province.id
  return extractResourceId(province)
}

export function getProvinceIri(province: string | Province | undefined): string {
  if (!province) return ''
  return extractIri(province) ?? (typeof province === 'string' ? province : province['@id'])
}

export function getProvinceLabel(province: string | Province | undefined): string {
  if (!province) return '—'
  if (typeof province === 'object') return province.label
  return province
}
