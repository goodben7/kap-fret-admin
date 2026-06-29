export const BAGGAGE_TYPE = {
  REGULAR: 'REGULAR',
  HAND: 'HAND',
  HAND_HOLD: 'HAND_HOLD',
  OVERSIZE: 'OVERSIZE',
} as const

export type BaggageType = (typeof BAGGAGE_TYPE)[keyof typeof BAGGAGE_TYPE]

export const BAGGAGE_TYPE_LABELS: Record<BaggageType, string> = {
  REGULAR: 'Bagage soute standard',
  HAND: 'Bagage à main',
  HAND_HOLD: 'Bagage soute + Bagage à main',
  OVERSIZE: 'Excédant',
}

export const BAGGAGE_TYPE_OPTIONS = Object.entries(BAGGAGE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

/** Franchise incluse par bagage soute standard (kg) */
export const CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG = 15

/** Franchise incluse par bagage à main (kg) */
export const CHECK_IN_HAND_BAGGAGE_ALLOWANCE_KG = 5

/** Franchise incluse bagage soute + bagage à main (kg) */
export const CHECK_IN_HAND_HOLD_BAGGAGE_ALLOWANCE_KG = 20

export function getDefaultBaggageWeightKg(baggageType: BaggageType): string {
  switch (baggageType) {
    case BAGGAGE_TYPE.REGULAR:
      return String(CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG)
    case BAGGAGE_TYPE.HAND:
      return String(CHECK_IN_HAND_BAGGAGE_ALLOWANCE_KG)
    case BAGGAGE_TYPE.HAND_HOLD:
      return String(CHECK_IN_HAND_HOLD_BAGGAGE_ALLOWANCE_KG)
    case BAGGAGE_TYPE.OVERSIZE:
      return ''
    default:
      return ''
  }
}

/** Types uniques (un seul exemplaire) ; OVERSIZE illimité */
const UNIQUE_BAGGAGE_TYPES = [
  BAGGAGE_TYPE.REGULAR,
  BAGGAGE_TYPE.HAND,
  BAGGAGE_TYPE.HAND_HOLD,
] as const

export type BaggageInput = { baggageType?: BaggageType; weight?: string }

function getHandHoldWeight(baggages: BaggageInput[]): number | null {
  const entry = baggages.find((baggage) => baggage.baggageType === BAGGAGE_TYPE.HAND_HOLD)
  if (!entry) return null
  const weight = parseFloat(entry.weight ?? '')
  return Number.isNaN(weight) ? 0 : weight
}

/** Poids main restant dans la franchise combinée (20 kg) quand soute+main < 20 */
export function getHandHoldHandRemainderKg(baggages: BaggageInput[]): string | null {
  const holdWeight = getHandHoldWeight(baggages)
  if (holdWeight == null || holdWeight >= CHECK_IN_HAND_HOLD_BAGGAGE_ALLOWANCE_KG) return null
  return (CHECK_IN_HAND_HOLD_BAGGAGE_ALLOWANCE_KG - holdWeight).toFixed(2)
}

export function getWeightForBaggageType(
  nextType: BaggageType,
  baggages: BaggageInput[],
  currentIndex: number,
): string {
  if (nextType === BAGGAGE_TYPE.HAND) {
    const otherBaggages = baggages.filter((_, index) => index !== currentIndex)
    const remainder = getHandHoldHandRemainderKg(otherBaggages)
    if (remainder != null) return remainder
  }
  return getDefaultBaggageWeightKg(nextType)
}

export function getAvailableBaggageTypeOptions(
  baggages: BaggageInput[],
  currentIndex: number,
): { value: string; label: string }[] {
  const usedTypes = new Set(
    baggages
      .map((baggage, index) => (index === currentIndex ? null : baggage.baggageType))
      .filter((type): type is BaggageType => !!type),
  )

  const hasRegular = usedTypes.has(BAGGAGE_TYPE.REGULAR)
  const hasHand = usedTypes.has(BAGGAGE_TYPE.HAND)
  const hasHandHold = usedTypes.has(BAGGAGE_TYPE.HAND_HOLD)
  const handHoldWeight = getHandHoldWeight(baggages)
  const handHoldUnderAllowance =
    handHoldWeight != null && handHoldWeight < CHECK_IN_HAND_HOLD_BAGGAGE_ALLOWANCE_KG

  return BAGGAGE_TYPE_OPTIONS.filter((option) => {
    if (option.value === BAGGAGE_TYPE.OVERSIZE) return true

    const type = option.value as BaggageType
    if (usedTypes.has(type)) return false

    // Soute + main séparés → pas de type combiné
    if (type === BAGGAGE_TYPE.HAND_HOLD && hasRegular && hasHand) return false

    // Combiné présent : soute seule interdite ; main autorisée si franchise restante
    if (hasHandHold) {
      if (type === BAGGAGE_TYPE.REGULAR) return false
      if (type === BAGGAGE_TYPE.HAND) return handHoldUnderAllowance && !hasHand
      if (type === BAGGAGE_TYPE.HAND_HOLD) return false
    }

    return true
  })
}

export function isUniqueBaggageType(type: BaggageType): boolean {
  return UNIQUE_BAGGAGE_TYPES.includes(type as (typeof UNIQUE_BAGGAGE_TYPES)[number])
}
