import { ArrowRight, Loader2 } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import type { PreviewConversionOutput } from '@/types/cash-transaction'

interface ConversionPreviewCardProps {
  preview?: PreviewConversionOutput
  isLoading?: boolean
  isError?: boolean
}

export function ConversionPreviewCard({ preview, isLoading, isError }: ConversionPreviewCardProps) {
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
      {!sameCurrency && (
        <p className="text-xs text-muted-foreground">
          Taux appliqué : 1 {originalCode} = {parseFloat(preview.rateUsed).toLocaleString('fr-FR')} {convertedCode}
        </p>
      )}
      {sameCurrency && (
        <p className="text-xs text-muted-foreground">
          La devise du billet correspond à celle de la caisse — pas de conversion.
        </p>
      )}
    </div>
  )
}
