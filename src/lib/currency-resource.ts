import type { CurrencyFormData } from '@/schemas/currency.schema'
import type { CurrencyPayload, CurrencyResource } from '@/types/currency-resource'
import { extractIri } from '@/lib/hydra'

export function currencyToFormDefaults(currency: CurrencyResource): CurrencyFormData {
  return {
    code: currency.code,
    label: currency.label,
    symbol: currency.symbol,
    active: currency.active,
    isDefault: currency.isDefault,
  }
}

export function toCurrencyPayload(data: CurrencyFormData): CurrencyPayload {
  return {
    code: data.code.trim().toUpperCase(),
    label: data.label.trim(),
    symbol: data.symbol.trim(),
    active: data.active,
    isDefault: data.isDefault,
  }
}

export function getCurrencyIssuingOfficeLabel(currency: CurrencyResource): string {
  const office = currency.issuingOffice
  if (!office) return '—'
  if (typeof office === 'object' && 'name' in office) return office.name
  return office
}

/** Code ISO (CDF, USD…) → IRI /api/currencies/{id} */
export function resolveCurrencyIriByCode(
  currencies: CurrencyResource[],
  code: string,
): string | undefined {
  const normalized = code.trim().toUpperCase()
  const match = currencies.find(
    (c) => c.code.toUpperCase() === normalized && c.active && !c.deleted,
  )
  if (!match) return undefined
  return extractIri(match) ?? match['@id']
}
