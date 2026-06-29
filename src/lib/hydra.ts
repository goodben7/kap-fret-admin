import type { HydraCollection, HydraView } from '@/types/hydra'

export function extractHydraMember<T>(data: HydraCollection<T> | T[]): T[] {
  if (Array.isArray(data)) {
    return data
  }
  return data['hydra:member'] ?? data.member ?? []
}

export function extractHydraTotalItems(data: HydraCollection<unknown>): number {
  return data['hydra:totalItems'] ?? data.totalItems ?? 0
}

export function extractHydraView(data: HydraCollection<unknown>): HydraView | undefined {
  return data['hydra:view']
}

export function getIriId(iri: string | undefined | null): number | null {
  const id = extractResourceId(iri)
  if (!id) return null
  const num = parseInt(id, 10)
  return Number.isNaN(num) ? null : num
}

/** Extrait l'identifiant final d'une IRI (numérique ou string ex. PRRSML0605120348) */
export function extractResourceId(iri: string | undefined | null): string | null {
  if (!iri) return null
  const match = iri.match(/\/([^/?]+)(?:\?.*)?$/)
  return match?.[1] ?? null
}

export function toIri(resource: string, id: number | string): string {
  return `/api/${resource}/${id}`
}

export function extractIri(value: string | { '@id': string } | undefined | null): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  return value['@id']
}

/** Normalise une IRI pour les filtres API Platform (chemin relatif /api/...) */
export function normalizeIri(iri: string): string {
  if (!iri) return iri
  if (iri.startsWith('http://') || iri.startsWith('https://')) {
    try {
      return new URL(iri).pathname
    } catch {
      return iri
    }
  }
  return iri.startsWith('/') ? iri : `/api/${iri}`
}
