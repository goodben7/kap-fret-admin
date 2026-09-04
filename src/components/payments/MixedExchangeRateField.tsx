import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface MixedExchangeRateFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
  hintRate?: number | null
  className?: string
  disabled?: boolean
}

/** Champ taux manuel pour paiements mixtes : 1 USD = N CDF. */
export function MixedExchangeRateField({
  value,
  onChange,
  error,
  hintRate,
  className,
  disabled,
}: MixedExchangeRateFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <Input
        label="Taux de change (1 USD = … CDF)"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder={hintRate != null ? hintRate.toFixed(2) : 'ex. 2850'}
        className={fieldClass}
        error={error}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {hintRate != null && !value.trim() && (
        <p className="text-xs text-muted-foreground">
          Prérempli avec le taux admin : 1 USD = {hintRate.toFixed(2)} CDF — modifiable pour ce paiement.
        </p>
      )}
      {value.trim() && (
        <p className="text-xs text-muted-foreground">
          Ce taux s&apos;applique uniquement à ce paiement mixte.
        </p>
      )}
    </div>
  )
}
