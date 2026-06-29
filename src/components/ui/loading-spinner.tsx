import { BRAND } from '@/constants/brand'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const ringSizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

const logoSizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-11 w-11',
}

/** Petit loader inline (boutons, selects) — image déjà en cache */
export function LoaderIcon({ className }: { className?: string }) {
  return (
    <img
      src={BRAND.logoIconSrc}
      alt=""
      aria-hidden="true"
      decoding="async"
      className={cn('h-4 w-4 shrink-0 object-contain animate-kap-loader-breathe', className)}
    />
  )
}

/** Loader principal KAP FRET — CSS pur, réutilise /logo.png */
export function LoadingSpinner({ className, size = 'md', label = 'Chargement...' }: LoadingSpinnerProps) {
  const showLabel = label !== ''

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-label={label || 'Chargement'}
    >
      <div className={cn('relative flex items-center justify-center', ringSizeClasses[size])}>
        <span
          className="absolute inset-0 rounded-full border-2 border-brand-orange/20 border-t-brand-orange animate-kap-loader-ring"
          aria-hidden="true"
        />
        <span
          className="absolute inset-[18%] rounded-full bg-brand-orange/10 animate-kap-loader-pulse"
          aria-hidden="true"
        />
        <img
          src={BRAND.logoIconSrc}
          alt=""
          decoding="async"
          className={cn('relative z-10 object-contain animate-kap-loader-breathe', logoSizeClasses[size])}
        />
      </div>
      {showLabel && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
    </div>
  )
}

export { LoadingSpinner as KapFretLoader }
