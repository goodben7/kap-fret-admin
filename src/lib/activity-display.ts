const ISSUING_OFFICE_RESOURCE = 'App\\User\\Entity\\IssuingOffice'

export function normalizeActivityResourceName(ressourceName: string): string {
  if (ressourceName.includes('IssuingOffice')) return 'issuing_office'
  return ressourceName
}

const RESOURCE_LABELS: Record<string, string> = {
  ticket: 'Billet',
  freight_shipment: 'Expédition fret',
  check_in: 'Check-in',
  user: 'Utilisateur',
  issuing_office: 'Bureau d\'émission',
  [ISSUING_OFFICE_RESOURCE]: 'Bureau d\'émission',
}

export function getActivityResourceLabel(ressourceName: string): string {
  return RESOURCE_LABELS[ressourceName]
    ?? RESOURCE_LABELS[normalizeActivityResourceName(ressourceName)]
    ?? ressourceName
}

export function getActivityResourcePath(ressourceName: string, id: string): string | null {
  switch (normalizeActivityResourceName(ressourceName)) {
    case 'ticket':
      return `/tickets/${id}`
    case 'freight_shipment':
      return `/freight/${id}`
    case 'check_in':
      return `/checkins/${id}`
    case 'user':
      return `/admin/users/${id}/edit`
    case 'issuing_office':
      return `/admin/issuing-offices/${id}`
    default:
      return null
  }
}

export const ACTIVITY_RESOURCE_FILTER_OPTIONS = [
  { value: '', label: 'Toutes les ressources' },
  { value: 'ticket', label: 'Billet' },
  { value: 'freight_shipment', label: 'Expédition fret' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'user', label: 'Utilisateur' },
  { value: ISSUING_OFFICE_RESOURCE, label: 'Bureau d\'émission' },
] as const
