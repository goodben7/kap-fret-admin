import { Calendar, Filter, RefreshCw } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CURRENCY_OPTIONS } from '@/constants/ticket'
import { resolveStatsDateRange } from '@/lib/stats'
import type { StatsFilters, StatsPeriodPreset, StatsTypeFilter } from '@/types/stats'
import { cn } from '@/lib/utils'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const PERIOD_OPTIONS: { value: StatsPeriodPreset; label: string }[] = [
  { value: 'day', label: "Aujourd'hui" },
  { value: 'week', label: '7 derniers jours' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
  { value: 'custom', label: 'Personnalisé' },
]

const TYPE_OPTIONS: { value: StatsTypeFilter; label: string }[] = [
  { value: '', label: 'Toutes les données' },
  { value: 'tickets', label: 'Billetterie' },
  { value: 'freight', label: 'Fret' },
  { value: 'checkIn', label: 'Check-in' },
  { value: 'finance', label: 'Finance' },
]

export interface DashboardFiltersState {
  period: StatsPeriodPreset
  startDate: string
  endDate: string
  currency: StatsFilters['currency']
  issuingOfficeId: string
  type: StatsTypeFilter
}

interface DashboardFiltersProps {
  filters: DashboardFiltersState
  onChange: (patch: Partial<DashboardFiltersState>) => void
  issuingOfficeOptions: { value: string; label: string }[]
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function buildStatsFiltersFromState(state: DashboardFiltersState): StatsFilters {
  const range = state.period === 'custom'
    ? { startDate: state.startDate, endDate: state.endDate }
    : resolveStatsDateRange(state.period)

  return {
    startDate: state.period === 'custom' ? state.startDate : range.startDate,
    endDate: state.period === 'custom' ? state.endDate : range.endDate,
    currency: state.currency || undefined,
    issuingOfficeId: state.issuingOfficeId || undefined,
    type: state.type || undefined,
  }
}

export function DashboardFilters({
  filters,
  onChange,
  issuingOfficeOptions,
  onRefresh,
  isRefreshing,
}: DashboardFiltersProps) {
  const set = (patch: Partial<DashboardFiltersState>) => onChange(patch)

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <Filter className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">Filtres</p>
            <p className="text-xs text-muted-foreground">Affinez les statistiques affichées</p>
          </div>
        </div>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Actualiser
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Période"
          options={PERIOD_OPTIONS}
          value={filters.period}
          onChange={(e) => set({ period: e.target.value as StatsPeriodPreset })}
          variant="filter"
        />
        <Select
          label="Devise"
          options={[{ value: '', label: 'Toutes les devises' }, ...CURRENCY_OPTIONS]}
          value={filters.currency ?? ''}
          onChange={(e) => set({ currency: e.target.value as StatsFilters['currency'] })}
          variant="filter"
        />
        <Select
          label="Bureau émetteur"
          placeholder={issuingOfficeOptions.length ? 'Tous les bureaux' : 'Chargement...'}
          options={[{ value: '', label: 'Tous les bureaux' }, ...issuingOfficeOptions]}
          value={filters.issuingOfficeId}
          onChange={(e) => set({ issuingOfficeId: e.target.value })}
          variant="filter"
        />
        <Select
          label="Type"
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(e) => set({ type: e.target.value as StatsTypeFilter })}
          variant="filter"
        />
      </div>

      {filters.period === 'custom' && (
        <div className="mt-4 grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
          <Input
            label="Date de début"
            type="date"
            className={fieldClass}
            value={filters.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
          <Input
            label="Date de fin"
            type="date"
            className={fieldClass}
            value={filters.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        {filters.period === 'custom'
          ? `${filters.startDate} → ${filters.endDate}`
          : `${buildStatsFiltersFromState(filters).startDate} → ${buildStatsFiltersFromState(filters).endDate}`}
      </p>
    </div>
  )
}
