export const PERSON_TYPES = {
  SPADM: 'SPADM',
  ADM: 'ADM',
  TKT: 'TKT',
  CHK: 'CHK',
  FRT: 'FRT',
  MGR: 'MGR',
  USR: 'USR',
} as const

export type PersonType = (typeof PERSON_TYPES)[keyof typeof PERSON_TYPES]

export const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  SPADM: 'Super Admin',
  ADM: 'Administrateur',
  TKT: 'Agent Billetterie',
  CHK: 'Agent Check-In',
  FRT: 'Agent Fret',
  MGR: 'Responsable',
  USR: 'Utilisateur basique',
}
