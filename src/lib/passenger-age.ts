/** Valeur YYYY-MM-DD pour `<input type="date">` */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
    return match?.[1] ?? ''
  }
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Âge en années révolues à la date de référence (voyage ou aujourd'hui). */
export function ageFromBirthDate(
  birthDate: string | null | undefined,
  referenceDate?: string | null,
): number | undefined {
  const birth = toDateInputValue(birthDate)
  if (!birth) return undefined
  const ref = toDateInputValue(referenceDate) || toDateInputValue(new Date())
  if (!ref) return undefined

  const birthParts = birth.split('-').map(Number)
  const refParts = ref.split('-').map(Number)
  const by = birthParts[0]
  const bm = birthParts[1]
  const bd = birthParts[2]
  const ry = refParts[0]
  const rm = refParts[1]
  const rd = refParts[2]
  if (
    by === undefined
    || bm === undefined
    || bd === undefined
    || ry === undefined
    || rm === undefined
    || rd === undefined
    || ![by, bm, bd, ry, rm, rd].every((n) => Number.isFinite(n))
  ) {
    return undefined
  }

  let age = ry - by
  if (rm < bm || (rm === bm && rd < bd)) age -= 1
  return age < 0 ? 0 : age
}

export function formatBirthDateDisplay(birthDate: string | null | undefined): string {
  const value = toDateInputValue(birthDate)
  if (!value) return '—'
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}

export function isValidBirthDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  return !Number.isNaN(parsed.getTime()) && toDateInputValue(parsed) === value
}
