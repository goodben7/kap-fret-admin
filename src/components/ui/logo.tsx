import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { BRAND } from '@/constants/brand'

export type LogoVariant = 'auth' | 'sidebar' | 'header' | 'compact' | 'card'

const variantClass: Record<LogoVariant, string> = {
  auth: 'h-24 sm:h-28 w-auto max-w-[min(100%,300px)]',
  sidebar: 'h-10 w-auto max-w-[190px]',
  header: 'h-10 w-10',
  compact: 'h-7 w-auto max-w-[110px]',
  card: 'h-16 w-auto max-w-[220px]',
}

const variantSrc: Partial<Record<LogoVariant, string>> = {
  header: BRAND.logoIconSrc,
}

interface LogoProps {
  variant?: LogoVariant
  className?: string
  linkTo?: string
}

export function Logo({ variant = 'compact', className, linkTo }: LogoProps) {
  const centered = variant === 'sidebar' || variant === 'auth'

  const src = variantSrc[variant] ?? BRAND.logoSrc

  const img = (
    <img
      src={src}
      alt={BRAND.logoAlt}
      className={cn(
        'object-contain',
        centered ? 'object-center' : 'object-left',
        variantClass[variant],
        className,
      )}
      decoding="async"
    />
  )

  const content = linkTo ? (
    <Link
      to={linkTo}
      className={cn(
        'inline-flex shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-sm',
        centered && 'justify-center',
      )}
    >
      {img}
    </Link>
  ) : (
    img
  )

  return content
}
