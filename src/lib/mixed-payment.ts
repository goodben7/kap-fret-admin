import { CURRENCY, type Currency } from '@/constants/ticket'
import {
  convertAmountBetweenCurrencyCodes,
  getActiveUsdToCdfRate,
} from '@/lib/exchange-rate'
import type { ExchangeRateResource } from '@/types/exchange-rate'

function parseMoney(value: string | number | null | undefined): number {
  if (value == null || value === '') return NaN
  return typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
}

/**
 * Résout le taux 1 USD = N CDF : manuel si > 0, sinon taux actif admin.
 */
export function resolveUsdToCdfRate(
  exchangeRates: ExchangeRateResource[] = [],
  manualRate?: string | number | null,
): number | null {
  const manual = parseMoney(manualRate)
  if (Number.isFinite(manual) && manual > 0) return manual
  return getActiveUsdToCdfRate(exchangeRates)
}

export function convertWithUsdToCdfRate(
  amount: number,
  fromCode: string,
  toCode: string,
  usdToCdfRate: number,
): number | null {
  const from = fromCode.trim().toUpperCase()
  const to = toCode.trim().toUpperCase()
  if (!Number.isFinite(amount) || !Number.isFinite(usdToCdfRate) || usdToCdfRate <= 0) return null
  if (from === to) return amount
  if (from === CURRENCY.USD && to === CURRENCY.CDF) return amount * usdToCdfRate
  if (from === CURRENCY.CDF && to === CURRENCY.USD) return amount / usdToCdfRate
  return null
}

function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  exchangeRates: ExchangeRateResource[],
  manualRate?: string | number | null,
): number | null {
  const rate = resolveUsdToCdfRate(exchangeRates, manualRate)
  if (rate != null) {
    const converted = convertWithUsdToCdfRate(amount, fromCode, toCode, rate)
    if (converted != null) return converted
  }
  return convertAmountBetweenCurrencyCodes(amount, fromCode, toCode, exchangeRates)
}

/** Montant USD équivalent d'un paiement mixte (USD + CDF). */
export function computeMixedPaymentUsdEquivalent(
  paidAmountUsd: string | number,
  paidAmountCdf: string | number,
  exchangeRates: ExchangeRateResource[] = [],
  manualRate?: string | number | null,
): number | null {
  const usd = parseMoney(paidAmountUsd)
  const cdf = parseMoney(paidAmountCdf)
  if (!Number.isFinite(usd) || !Number.isFinite(cdf) || usd < 0 || cdf < 0) return null
  if (usd <= 0 || cdf <= 0) return null
  const fromCdf = convertAmount(cdf, CURRENCY.CDF, CURRENCY.USD, exchangeRates, manualRate)
  if (fromCdf == null) return null
  return usd + fromCdf
}

/** Équivalent du paiement mixte dans la devise du dû (USD ou CDF). */
export function computeMixedPaymentEquivalentInCurrency(
  paidAmountUsd: string | number,
  paidAmountCdf: string | number,
  dueCurrency: Currency,
  exchangeRates: ExchangeRateResource[] = [],
  manualRate?: string | number | null,
): number | null {
  if (dueCurrency === CURRENCY.USD) {
    return computeMixedPaymentUsdEquivalent(paidAmountUsd, paidAmountCdf, exchangeRates, manualRate)
  }
  const usd = parseMoney(paidAmountUsd)
  const cdf = parseMoney(paidAmountCdf)
  if (!Number.isFinite(usd) || !Number.isFinite(cdf) || usd <= 0 || cdf <= 0) return null
  const fromUsd = convertAmount(usd, CURRENCY.USD, CURRENCY.CDF, exchangeRates, manualRate)
  if (fromUsd == null) return null
  return cdf + fromUsd
}

/** Suggère le montant CDF pour couvrir le reste (dû en USD ou CDF). */
export function suggestMixedPaymentCdf(
  dueAmount: number,
  paidAmountUsd: string | number,
  exchangeRates: ExchangeRateResource[] = [],
  dueCurrency: Currency = CURRENCY.USD,
  manualRate?: string | number | null,
): string | null {
  const usd = parseMoney(paidAmountUsd)
  if (!Number.isFinite(dueAmount) || !Number.isFinite(usd) || dueAmount <= 0 || usd <= 0) {
    return null
  }

  if (dueCurrency === CURRENCY.USD) {
    if (usd >= dueAmount) return null
    const remaining = dueAmount - usd
    const cdf = convertAmount(remaining, CURRENCY.USD, CURRENCY.CDF, exchangeRates, manualRate)
    if (cdf == null) return null
    return cdf.toFixed(2)
  }

  const fromUsd = convertAmount(usd, CURRENCY.USD, CURRENCY.CDF, exchangeRates, manualRate)
  if (fromUsd == null || fromUsd >= dueAmount) return null
  return (dueAmount - fromUsd).toFixed(2)
}

export function isMixedPaymentWithinTolerance(
  dueAmount: number,
  paidAmountUsd: string | number,
  paidAmountCdf: string | number,
  exchangeRates: ExchangeRateResource[] = [],
  toleranceUsd = 0.05,
  dueCurrency: Currency = CURRENCY.USD,
  manualRate?: string | number | null,
): boolean {
  const equivalent = computeMixedPaymentEquivalentInCurrency(
    paidAmountUsd,
    paidAmountCdf,
    dueCurrency,
    exchangeRates,
    manualRate,
  )
  if (equivalent == null || !Number.isFinite(dueAmount)) return false

  if (dueCurrency === CURRENCY.USD) {
    return Math.abs(equivalent - dueAmount) <= toleranceUsd
  }

  const toleranceCdf = convertAmount(
    toleranceUsd,
    CURRENCY.USD,
    CURRENCY.CDF,
    exchangeRates,
    manualRate,
  )
  if (toleranceCdf == null) return false
  return Math.abs(equivalent - dueAmount) <= toleranceCdf
}

/** Découpe un dû en deux montants TX (devise du dû) pour l'API caisse. */
export function splitMixedPaymentLedgerAmounts(
  dueAmount: number,
  paidAmountUsd: string | number,
  paidAmountCdf: string | number,
  dueCurrency: Currency,
  exchangeRates: ExchangeRateResource[] = [],
  manualRate?: string | number | null,
): { usdLegAmount: string; cdfLegAmount: string } | null {
  if (!isMixedPaymentWithinTolerance(
    dueAmount,
    paidAmountUsd,
    paidAmountCdf,
    exchangeRates,
    0.05,
    dueCurrency,
    manualRate,
  )) {
    return null
  }
  const usd = parseMoney(paidAmountUsd)
  const cdf = parseMoney(paidAmountCdf)
  if (!Number.isFinite(usd) || !Number.isFinite(cdf)) return null

  if (dueCurrency === CURRENCY.USD) {
    return {
      usdLegAmount: usd.toFixed(2),
      cdfLegAmount: (dueAmount - usd).toFixed(2),
    }
  }

  return {
    usdLegAmount: (dueAmount - cdf).toFixed(2),
    cdfLegAmount: cdf.toFixed(2),
  }
}

/** Normalise le taux pour l'API (vide → undefined). */
export function formatExchangeRateForPayload(rate?: string | null): string | undefined {
  const value = parseMoney(rate)
  if (!Number.isFinite(value) || value <= 0) return undefined
  return value.toFixed(2)
}
