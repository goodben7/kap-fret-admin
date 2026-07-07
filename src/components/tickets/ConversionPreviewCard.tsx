import { ArrowRight, Loader2 } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import type { Currency } from '@/constants/ticket'
import type { PreviewConversionOutput } from '@/types/cash-transaction'

interface ConversionPreviewCardProps {
  preview?: PreviewConversionOutput
  isLoading?: boolean
  isError?: boolean
  /** Montant de référence (ex. total billet USD). */
  referenceAmount?: number
  referenceCurrency?: Currency
  /** Devise d'encaissement choisie dans le formulaire. */
  paymentCurrency?: Currency
  /** Montant converti local si l'API ne renvoie pas la jambe cible. */
  fallbackPaymentAmount?: number
}

function pickAmountForCurrency(
  preview: PreviewConversionOutput,
  targetCode: Currency,
  fallbackAmount?: number,
): number {
  const originalAmount = parseFloat(preview.originalAmount) || 0
  const convertedAmount = parseFloat(preview.convertedAmount) || 0
  const originalCode = preview.originalCurrency.code
  const convertedCode = preview.convertedCurrency.code

  if (convertedCode === targetCode) return convertedAmount
  if (originalCode === targetCode) return originalAmount
  if (fallbackAmount != null && fallbackAmount > 0) return fallbackAmount
  return originalAmount
}

export function ConversionPreviewCard({
  preview,
  isLoading,
  isError,
  referenceAmount,
  referenceCurrency,
  paymentCurrency,
  fallbackPaymentAmount,
}: ConversionPreviewCardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:col-span-2">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        Calcul de la conversion caisse…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:col-span-2">
        Impossible de calculer la conversion pour cette caisse et ce montant.
      </div>
    )
  }

  if (!preview) return null

  const originalCode = preview.originalCurrency.code
  const convertedCode = preview.convertedCurrency.code
  const originalAmount = parseFloat(preview.originalAmount) || 0
  const convertedAmount = parseFloat(preview.convertedAmount) || 0

  const crossCurrencyPayment =
    referenceAmount != null
    && referenceCurrency
    && paymentCurrency
    && referenceCurrency !== paymentCurrency

  if (crossCurrencyPayment) {
    const paymentAmount = pickAmountForCurrency(preview, paymentCurrency, fallbackPaymentAmount)
    const appliedRate = referenceAmount > 0 ? paymentAmount / referenceAmount : 0

    return (
      <div className="space-y-2 rounded-xl border border-brand-orange/25 bg-brand-orange/5 px-4 py-3 sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Aperçu conversion caisse
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold tabular-nums">
            {formatMoney(referenceAmount, referenceCurrency)}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-bold tabular-nums text-brand-orange">
            {formatMoney(paymentAmount, paymentCurrency)}
          </span>
        </div>
        {appliedRate > 0 && (
          <p className="text-xs text-muted-foreground">
            Taux appliqué : 1 {referenceCurrency} ={' '}
            {appliedRate.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {paymentCurrency}
          </p>
        )}
      </div>
    )
  }

  const sameCurrency = originalCode === convertedCode

  return (
    <div className="space-y-2 rounded-xl border border-brand-orange/25 bg-brand-orange/5 px-4 py-3 sm:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Aperçu conversion caisse
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums">{formatMoney(originalAmount, originalCode)}</span>
        {!sameCurrency && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-bold tabular-nums text-brand-orange">
              {formatMoney(convertedAmount, convertedCode)}
            </span>
          </>
        )}
      </div>
      {!sameCurrency && (parseFloat(preview.rateUsed) || 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          Taux appliqué : 1 {originalCode} ={' '}
          {parseFloat(preview.rateUsed).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {convertedCode}
        </p>
      )}
      {sameCurrency && (
        <p className="text-xs text-muted-foreground">
          Paiement en {originalCode} — pas de conversion.
        </p>
      )}
    </div>
  )
}
