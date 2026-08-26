import { getApiBaseUrl } from '@/lib/api-config'

/** Construit l'URL absolue d'une photo stockée en chemin relatif public. */
export function resolveUserPhotoUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath?.trim()) return null
  const path = photoPath.trim().replace(/^\//, '')
  const base = getApiBaseUrl()
  // Cache-bust léger pour forcer le refresh après upload
  return `${base}/${path}`
}
