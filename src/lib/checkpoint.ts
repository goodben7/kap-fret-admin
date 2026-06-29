import { extractIri, extractResourceId, normalizeIri, toIri } from '@/lib/hydra'
import type { Checkpoint } from '@/types/entities'

export interface CheckpointSelectOption {
  value: string
  label: string
}

export function getCheckpointId(checkpoint: string | Checkpoint | undefined): string | null {
  if (!checkpoint) return null
  if (typeof checkpoint === 'object') return checkpoint.id ? String(checkpoint.id) : null
  return extractResourceId(normalizeIri(checkpoint))
}

export function resolveCheckpointIri(cp: Pick<Checkpoint, 'id' | '@id'> | string): string {
  if (typeof cp === 'string') return normalizeIri(cp)
  const id = cp.id ?? extractResourceId(extractIri(cp['@id']))
  if (id) return toIri('checkpoints', id)
  return normalizeIri(extractIri(cp['@id']) ?? '')
}

/** Normalise un membre Hydra (objet ou IRI string) */
export function parseCheckpointMember(raw: unknown): Checkpoint | null {
  if (typeof raw === 'string') {
    const value = normalizeIri(raw)
    const id = extractResourceId(value)
    if (!id) return null
    return {
      '@id': value,
      '@type': 'Checkpoint',
      id,
      label: id,
      active: true,
      latitude: 0,
      longitude: 0,
      province: '',
    }
  }
  if (!raw || typeof raw !== 'object') return null
  const cp = raw as Checkpoint
  if (!cp.id && !cp['@id'] && !cp.label) return null
  return cp
}

export function checkpointToSelectOption(cp: Checkpoint | string): CheckpointSelectOption {
  if (typeof cp === 'string') {
    const value = normalizeIri(cp)
    const id = extractResourceId(value)
    return {
      value: id ? toIri('checkpoints', id) : value,
      label: id ?? value,
    }
  }

  const id = cp.id ?? extractResourceId(extractIri(cp['@id']))
  const value = id ? toIri('checkpoints', id) : resolveCheckpointIri(cp)

  return {
    value,
    label: getCheckpointLabel(cp) || id || value,
  }
}

export function getCheckpointLabelFromRef(checkpoint: string | Checkpoint | undefined): string | null {
  if (!checkpoint || typeof checkpoint !== 'object') return null
  const label = getCheckpointLabel(checkpoint)
  return label || null
}

export function getCheckpointLabel(
  cp: Pick<Checkpoint, 'label' | 'province'> & { name?: string; code?: string },
): string {
  const name = cp.label ?? cp.name ?? ''
  if (cp.code) return `${name} (${cp.code})`
  if (typeof cp.province === 'object' && cp.province?.label) {
    return `${name} (${cp.province.label})`
  }
  return name
}

export function getCheckpointDisplayName(cp: string | Checkpoint): string {
  return typeof cp === 'object' ? getCheckpointLabel(cp) : cp
}

export function getCheckpointSearchText(cp: Checkpoint): string {
  const parts = [cp.label, cp.id, getCheckpointLabel(cp)]
  if (typeof cp.province === 'object' && cp.province?.label) {
    parts.push(cp.province.label)
  }
  return parts.filter(Boolean).join(' ').toLowerCase()
}
