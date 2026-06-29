import { extractIri, normalizeIri, toIri } from '@/lib/hydra'
import type { AuthUser } from '@/types/auth'
import type { IssuingOfficeFormData } from '@/schemas/issuing-office.schema'
import type { IssuingOffice, IssuingOfficeCurrencyRef, IssuingOfficeCreatePayload, IssuingOfficePatchPayload } from '@/types/issuing-office'

export function getIssuingOfficeCurrencyRef(
  currency: string | IssuingOfficeCurrencyRef | undefined,
): IssuingOfficeCurrencyRef | null {
  if (!currency || typeof currency === 'string') return null
  return currency
}

export function getIssuingOfficeCurrencyCode(
  currency: string | IssuingOfficeCurrencyRef | undefined,
): string | null {
  const ref = getIssuingOfficeCurrencyRef(currency)
  return ref?.code ?? null
}

export function getIssuingOfficeCurrencyLabel(
  currency: string | IssuingOfficeCurrencyRef | undefined,
): string {
  const ref = getIssuingOfficeCurrencyRef(currency)
  if (ref) return `${ref.code} — ${ref.label} (${ref.symbol})`
  return '—'
}

export function getIssuingOfficeCurrencyIri(office: IssuingOffice): string {
  return extractIri(office.currency) ?? (typeof office.currency === 'string' ? office.currency : '')
}

export function toIssuingOfficeCreatePayload(data: IssuingOfficeFormData): IssuingOfficeCreatePayload {
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    checkpoint: normalizeIri(data.checkpoint),
    address: data.address?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    active: data.active,
  }
}

export function toIssuingOfficePatchPayload(data: IssuingOfficeFormData): IssuingOfficePatchPayload {
  const payload: IssuingOfficePatchPayload = {
    code: data.code.trim(),
    name: data.name.trim(),
    checkpoint: normalizeIri(data.checkpoint),
    address: data.address?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    active: data.active,
  }

  const currency = data.currency?.trim()
  if (currency) payload.currency = normalizeIri(currency)

  return payload
}

export function issuingOfficeToFormDefaults(office: IssuingOffice): IssuingOfficeFormData {
  return {
    code: office.code,
    name: office.name,
    checkpoint: extractIri(office.checkpoint) ?? (typeof office.checkpoint === 'string' ? office.checkpoint : ''),
    address: office.address ?? '',
    phone: office.phone ?? '',
    active: office.active,
    currency: getIssuingOfficeCurrencyIri(office),
  }
}

/** IRI bureau d'émission de l'utilisateur connecté (création billet, caisses, etc.) */
export function resolveUserIssuingOfficeIri(user: AuthUser | null | undefined): string | undefined {
  if (!user) return undefined

  const embedded = user.holder?.['@id'] ?? user.issuingOffice?.['@id']
  if (embedded) return normalizeIri(embedded)

  const holderId = user.holderId?.trim()
  if (!holderId) return undefined
  if (holderId.startsWith('/api/') || holderId.startsWith('http')) return normalizeIri(holderId)

  return toIri('issuing_offices', holderId)
}
