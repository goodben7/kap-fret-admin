import { CURRENCY, type Currency } from '@/constants/ticket'
import { convertAmountBetweenCurrencyCodes } from '@/lib/exchange-rate'
import type { ExchangeRateResource } from '@/types/exchange-rate'

function parseMoney(value: string | number): number {
  return typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
}

/** Montant USD équivalent d'un paiement mixte (USD + CDF). */
export function computeMixedPaymentUsdEquivalent(
  paidAmountUsd: string | number,
  paidAmountCdf: string | number,
  exchangeRates: ExchangeRateResource[] = [],
): number | null {
  const usd = parseMoney(paidAmountUsd)
  const cdf = parseMoney(paidAmountCdf)
  if (!Number.isFinite(usd) || !Number.isFinite(cdf) || usd < 0 || cdf < 0) return null
  if (usd <= 0 || cdf <= 0) return null
  const fromCdf = convertAmountBetweenCurrencyCodes(cdf, CURRENCY.CDF, CURRENCY.USD, exchangeRates)
  if (fromCdf == null) return null
  return usd + fromCdf
}

/** Équivalent du paiement mixte dans la devise du dû (USD ou CDF). */
export function computeMixedPaymentEquivalentInCurrency(
  paidAmountUsd: string | number,
  paidAmountCdf: string | number,
  dueCurrency: Currency,
  exchangeRates: ExchangeRateResource[] = [],
): number | null {
  if (dueCurrency === CURRENCY.USD) {
    return computeMixedPaymentUsdEquivalent(paidAmountUsd, paidAmountCdf, exchangeRates)
  }
  const usd = parseMoney(paidAmountUsd)
  const cdf = parseMoney(paidAmountCdf)
  if (!Number.isFinite(usd) || !Number.isFinite(cdf) || usd <= 0 || cdf <= 0) return null
  const fromUsd = convertAmountBetweenCurrencyCodes(usd, CURRENCY.USD, CURRENCY.CDF, exchangeRates)
  if (fromUsd == null) return null
  return cdf + fromUsd
}

/** Suggère le montant CDF pour couvrir le reste (dû en USD ou CDF). */
export function suggestMixedPaymentCdf(
  dueAmount: number,
  paidAmountUsd: string | number,
  exchangeRates: ExchangeRateResource[] = [],
  dueCurrency: Currency = CURRENCY.USD,
): string | null {
  const usd = parseMoney(paidAmountUsd)
  if (!Number.isFinite(dueAmount) || !Number.isFinite(usd) || dueAmount <= 0 || usd <= 0) {
    return null
  }

  if (dueCurrency === CURRENCY.USD) {
    if (usd >= dueAmount) return null
    const remaining = dueAmount - usd
    const cdf = convertAmountBetweenCurrencyCodes(remaining, CURRENCY.USD, CURRENCY.CDF, exchangeRates)
    if (cdf == null) return null
    return cdf.toFixed(2)
  }

  const fromUsd = convertAmountBetweenCurrencyCodes(usd, CURRENCY.USD, CURRENCY.CDF, exchangeRates)
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
): boolean {
  const equivalent = computeMixedPaymentEquivalentInCurrency(
    paidAmountUsd,
    paidAmountCdf,
    dueCurrency,
    exchangeRates,
  )
  if (equivalent == null || !Number.isFinite(dueAmount)) return false

  if (dueCurrency === CURRENCY.USD) {
    return Math.abs(equivalent - dueAmount) <= toleranceUsd
  }

  const toleranceCdf = convertAmountBetweenCurrencyCodes(
    toleranceUsd,
    CURRENCY.USD,
    CURRENCY.CDF,
    exchangeRates,
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
): { usdLegAmount: string; cdfLegAmount: string } | null {
  if (!isMixedPaymentWithinTolerance(dueAmount, paidAmountUsd, paidAmountCdf, exchangeRates, 0.05, dueCurrency)) {
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
