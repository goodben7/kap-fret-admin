/** Indicatif par défaut (RDC) pour les numéros saisis sans + / sans indicatif. */
export const DEFAULT_PHONE_COUNTRY_CODE = '243'

/** Digits only (for comparisons / display helpers). */
export function toPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Numéro international sans « + » pour wa.me (ex. 243812345678).
 * - enlève le 0 local (0812… → 243812…)
 * - accepte déjà +243 / 243 / 00243
 */
export function toWhatsAppDigits(
  phone: string | null | undefined,
  defaultCountryCode: string = DEFAULT_PHONE_COUNTRY_CODE,
): string {
  let digits = toPhoneDigits(phone)
  if (!digits) return ''

  // Préfixe international 00…
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  const cc = defaultCountryCode.replace(/\D/g, '')
  if (!cc) return digits

  // Déjà avec indicatif pays
  if (digits.startsWith(cc)) {
    return digits
  }

  // Numéro local avec 0 (ex. 0812345678 → 243812345678)
  if (digits.startsWith('0')) {
    return `${cc}${digits.slice(1)}`
  }

  // Numéro national sans 0 (ex. 812345678 → 243812345678)
  // RDC : 9 chiffres après l’indicatif
  if (digits.length >= 8 && digits.length <= 10) {
    return `${cc}${digits}`
  }

  return digits
}

export function toTelHref(phone: string | null | undefined): string | null {
  const digits = toPhoneDigits(phone)
  if (!digits) return null
  const raw = phone?.trim() ?? ''
  // Prefer normalized international for dialer when local/0 format
  const intl = toWhatsAppDigits(phone)
  if (raw.startsWith('+') || intl.startsWith(DEFAULT_PHONE_COUNTRY_CODE)) {
    return `tel:+${intl}`
  }
  return `tel:${digits}`
}

/** Opens WhatsApp chat for the given phone (international digits, no +). */
export function toWhatsAppUrl(phone: string | null | undefined, text?: string): string | null {
  const digits = toWhatsAppDigits(phone)
  // wa.me needs country code + national number (typically ≥ 10–12 digits)
  if (!digits || digits.length < 10) return null
  const base = `https://wa.me/${digits}`
  if (!text?.trim()) return base
  return `${base}?text=${encodeURIComponent(text.trim())}`
}
