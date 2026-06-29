import { extractIri, normalizeIri } from '@/lib/hydra'
import type { ExchangeRateFormData } from '@/schemas/exchange-rate.schema'
import type {
  ExchangeRateCreatePayload,
  ExchangeRateCurrencyRef,
  ExchangeRatePatchPayload,
  ExchangeRateResource,
} from '@/types/exchange-rate'

export function getExchangeRateCurrencyRef(
  currency: string | ExchangeRateCurrencyRef | undefined,
): ExchangeRateCurrencyRef | null {
  if (!currency || typeof currency === 'string') return null
  return currency
}

export function getExchangeRateCurrencyCode(
  currency: string | ExchangeRateCurrencyRef | undefined,
): string {
  const ref = getExchangeRateCurrencyRef(currency)
  if (ref) return ref.code
  if (typeof currency === 'string') {
    const id = currency.split('/').pop()
    return id ?? '—'
  }
  return '—'
}

export function getExchangeRateCurrencyLabel(
  currency: string | ExchangeRateCurrencyRef | undefined,
): string {
  const ref = getExchangeRateCurrencyRef(currency)
  if (ref) return `${ref.code} — ${ref.label}`
  return '—'
}

export function formatExchangeRatePair(rate: ExchangeRateResource): string {
  const baseCode = getExchangeRateCurrencyCode(rate.baseCurrency)
  const targetCode = getExchangeRateCurrencyCode(rate.targetCurrency)
  return `${baseCode} → ${targetCode}`
}

export function formatExchangeRateEquation(rate: ExchangeRateResource): string {
  const baseCode = getExchangeRateCurrencyCode(rate.baseCurrency)
  const targetCode = getExchangeRateCurrencyCode(rate.targetCurrency)
  const base = parseFloat(rate.baseRate) || 0
  const target = parseFloat(rate.targetRate) || 0
  return `${base.toLocaleString('fr-FR')} ${baseCode} = ${target.toLocaleString('fr-FR')} ${targetCode}`
}

/** Convertit un montant via les taux actifs (ex. USD → CDF). */
export function convertAmountBetweenCurrencyCodes(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: ExchangeRateResource[],
): number | null {
  const from = fromCode.trim().toUpperCase()
  const to = toCode.trim().toUpperCase()
  if (from === to) return amount
  if (!Number.isFinite(amount)) return null

  for (const rate of rates) {
    if (!rate.active || rate.deleted) continue
    const baseCode = getExchangeRateCurrencyCode(rate.baseCurrency).toUpperCase()
    const targetCode = getExchangeRateCurrencyCode(rate.targetCurrency).toUpperCase()
    const baseRate = parseFloat(rate.baseRate)
    const targetRate = parseFloat(rate.targetRate)
    if (!baseRate || !targetRate) continue

    if (baseCode === from && targetCode === to) {
      return amount * (targetRate / baseRate)
    }
    if (baseCode === to && targetCode === from) {
      return amount * (baseRate / targetRate)
    }
  }

  return null
}

export function toExchangeRateCreatePayload(data: ExchangeRateFormData): ExchangeRateCreatePayload {
  return {
    baseCurrency: normalizeIri(data.baseCurrency),
    targetCurrency: normalizeIri(data.targetCurrency),
    baseRate: formatRateValue(data.baseRate),
    targetRate: formatRateValue(data.targetRate),
    active: data.active,
  }
}

export function toExchangeRatePatchPayload(data: Partial<ExchangeRateFormData>): ExchangeRatePatchPayload {
  const payload: ExchangeRatePatchPayload = {}
  if (data.active != null) payload.active = data.active
  if (data.baseRate?.trim()) payload.baseRate = formatRateValue(data.baseRate)
  if (data.targetRate?.trim()) payload.targetRate = formatRateValue(data.targetRate)
  if (data.baseCurrency?.trim()) payload.baseCurrency = normalizeIri(data.baseCurrency)
  if (data.targetCurrency?.trim()) payload.targetCurrency = normalizeIri(data.targetCurrency)
  return payload
}

export function exchangeRateToFormDefaults(rate: ExchangeRateResource): ExchangeRateFormData {
  return {
    baseCurrency: extractIri(rate.baseCurrency) ?? '',
    targetCurrency: extractIri(rate.targetCurrency) ?? '',
    baseRate: rate.baseRate,
    targetRate: rate.targetRate,
    active: rate.active,
  }
}

function formatRateValue(value: string): string {
  const num = parseFloat(value)
  if (Number.isNaN(num)) return value.trim()
  return String(num)
}
