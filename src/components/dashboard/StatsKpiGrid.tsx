import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { computeVariationPercent, formatVariationPercent } from '@/lib/stats'
import { cn, formatMoney } from '@/lib/utils'
import { CURRENCY, type Currency } from '@/constants/ticket'

export interface KpiItem {
  label: string
  value: string
  subValue?: string
  icon: LucideIcon
  accentClass?: string
  currentRaw?: number
  previousRaw?: number
  isCurrency?: boolean
  currency?: string
}

interface StatsKpiGridProps {
  items: KpiItem[]
  isLoading?: boolean
}

function KpiSkeleton() {
  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-5">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

function VariationBadge({
  current,
  previous,
}: {
  current?: number
  previous?: number
}) {
  if (current == null || previous == null) return null
  const variation = computeVariationPercent(current, previous)
  if (variation == null) return null

  const positive = variation >= 0
  const Icon = positive ? TrendingUp : TrendingDown

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        positive ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {formatVariationPercent(variation)}
    </span>
  )
}

export function StatsKpiGrid({ items, isLoading }: StatsKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{item.value}</p>
                {item.subValue && (
                  <p className="mt-1 text-xs text-muted-foreground">{item.subValue}</p>
                )}
                <div className="mt-2">
                  <VariationBadge current={item.currentRaw} previous={item.previousRaw} />
                </div>
              </div>
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10',
                  item.accentClass,
                )}
              >
                <item.icon className="h-5 w-5 text-brand-orange" aria-hidden="true" />
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function formatKpiMoney(amount: number, currency: Currency = CURRENCY.USD): string {
  return formatMoney(amount, currency)
}
