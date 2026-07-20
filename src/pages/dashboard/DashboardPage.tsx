import { useMemo, useState } from 'react'
import {
  Activity,
  Banknote,
  LayoutDashboard,
  Package,
  Receipt,
  Ticket,
  UserCheck,
  Wallet,
} from 'lucide-react'
import {
  buildStatsFiltersFromState,
  DashboardFilters,
  type DashboardFiltersState,
} from '@/components/dashboard/DashboardFilters'
import { StatsKpiGrid, formatKpiMoney, type KpiItem } from '@/components/dashboard/StatsKpiGrid'
import {
  CheckInStatusChart,
  CurrencyDistributionChart,
  CurrencyPieChart,
  FinanceFlowChart,
  FreightStatusChart,
  IssuingOfficeChart,
  TicketsStatusChart,
  TimelineChart,
  TimelineRevenueChart,
} from '@/components/dashboard/DashboardCharts'
import { CashRegistersSection } from '@/components/dashboard/CashRegistersSection'
import { DashboardRecentActivity } from '@/components/dashboard/DashboardRecentActivity'
import { useAppStats } from '@/hooks/useStats'
import { useIssuingOffices } from '@/hooks/useIssuingOffices'
import { getStartOfMonthInput, getTodayDateInput, computeTotalRevenue, computeRevenueBreakdown, computeConsolidatedRevenueCdf, formatFreightRevenue, formatStatsRevenueByCurrency, formatTotalRevenueAllCurrencies, formatFinanceAmountByCurrency } from '@/lib/stats'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import type { ExchangeRateResource } from '@/types/exchange-rate'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'
import { CURRENCY } from '@/constants/ticket'
import type { AppStats } from '@/types/stats'

function buildKpiItems(
  current: AppStats,
  previous: AppStats | null,
  options?: {
    currencyFilter?: typeof CURRENCY.USD | typeof CURRENCY.CDF
    exchangeRates?: ExchangeRateResource[]
  },
): KpiItem[] {
  const currencyFilter = options?.currencyFilter
  const exchangeRates = options?.exchangeRates ?? []
  const prev = previous?.summary
  const breakdown = computeRevenueBreakdown(current)
  const prevBreakdown = previous ? computeRevenueBreakdown(previous) : null

  const totalRevenueDisplay = currencyFilter
    ? {
        value: formatKpiMoney(computeTotalRevenue(current, currencyFilter), currencyFilter),
        subValue: undefined as string | undefined,
        currentRaw: computeTotalRevenue(current, currencyFilter),
        previousRaw: previous ? computeTotalRevenue(previous, currencyFilter) : undefined,
      }
    : (() => {
        const formatted = formatTotalRevenueAllCurrencies(breakdown, exchangeRates)
        const prevConsolidated = prevBreakdown
          ? computeConsolidatedRevenueCdf(prevBreakdown, exchangeRates)
          : null
        return {
          value: formatted.value,
          subValue: formatted.subValue,
          currentRaw: formatted.consolidatedCdf ?? breakdown.cdf + breakdown.usd,
          previousRaw: prevConsolidated?.total ?? undefined,
        }
      })()

  const items: KpiItem[] = [
    {
      label: 'Billets',
      value: String(current.tickets.total),
      subValue: formatStatsRevenueByCurrency(current.tickets.revenueCdf, current.tickets.revenueUsd, currencyFilter),
      icon: Ticket,
      currentRaw: current.tickets.total,
      previousRaw: previous?.tickets.total,
    },
    {
      label: 'Check-ins',
      value: String(current.checkIn.total),
      subValue: formatStatsRevenueByCurrency(current.checkIn.revenueCdf, current.checkIn.revenueUsd, currencyFilter),
      icon: UserCheck,
      currentRaw: current.checkIn.total,
      previousRaw: previous?.checkIn.total,
    },
    {
      label: 'Expéditions fret',
      value: String(current.freight.total),
      subValue: formatFreightRevenue(current.freight, currencyFilter),
      icon: Package,
      currentRaw: current.freight.total,
      previousRaw: previous?.freight.total,
    },
    {
      label: 'Transactions',
      value: String(current.summary.transactionsTotal),
      icon: Receipt,
      currentRaw: current.summary.transactionsTotal,
      previousRaw: prev?.transactionsTotal,
    },
    {
      label: 'Revenus totaux',
      value: totalRevenueDisplay.value,
      subValue: totalRevenueDisplay.subValue,
      icon: Banknote,
      currentRaw: totalRevenueDisplay.currentRaw,
      previousRaw: totalRevenueDisplay.previousRaw,
      isCurrency: true,
    },
    {
      label: 'Net finance',
      value: formatFinanceAmountByCurrency(current.byCurrency, 'net', currencyFilter),
      subValue: `${current.finance.entriesCount} entrées · ${current.finance.exitsCount} sorties`,
      icon: Activity,
      currentRaw: currencyFilter
        ? (current.byCurrency.find((row) => row.currency === currencyFilter)?.net ?? 0)
        : undefined,
      previousRaw: currencyFilter && previous
        ? (previous.byCurrency.find((row) => row.currency === currencyFilter)?.net ?? 0)
        : undefined,
    },
  ]

  if (!currencyFilter) {
    items.push(
      {
        label: 'Solde CDF',
        value: formatKpiMoney(parseFloat(current.summary.cashBalances[CURRENCY.CDF] ?? '0') || 0, CURRENCY.CDF),
        icon: Wallet,
      },
      {
        label: 'Solde USD',
        value: formatKpiMoney(parseFloat(current.summary.cashBalances[CURRENCY.USD] ?? '0') || 0, CURRENCY.USD),
        icon: Wallet,
      },
    )
  } else {
    items.push({
      label: `Solde ${currencyFilter}`,
      value: formatKpiMoney(parseFloat(current.summary.cashBalances[currencyFilter] ?? '0') || 0, currencyFilter),
      icon: Wallet,
    })
  }

  return items
}

export function DashboardPage() {
  const [filtersState, setFiltersState] = useState<DashboardFiltersState>({
    period: 'month',
    startDate: getStartOfMonthInput(),
    endDate: getTodayDateInput(),
    currency: '',
    issuingOfficeId: '',
    type: '',
  })

  const apiFilters = useMemo(
    () => buildStatsFiltersFromState(filtersState),
    [filtersState],
  )

  const { data, isLoading, isFetching, isError, refetch } = useAppStats(apiFilters)
  const { data: exchangeRatesData } = useExchangeRates({ pagination: false })
  const exchangeRates = exchangeRatesData?.items ?? []
  const { data: officesData } = useIssuingOffices({ itemsPerPage: 100, page: 1 })

  const issuingOfficeOptions = useMemo(
    () =>
      (officesData?.items ?? []).map((office) => ({
        value: office.id,
        label: office.name,
      })),
    [officesData?.items],
  )

  const stats = data?.current
  const typeFilter = filtersState.type
  const showTickets = !typeFilter || typeFilter === 'tickets'
  const showCheckIn = !typeFilter || typeFilter === 'checkIn'
  const showFreight = !typeFilter || typeFilter === 'freight'
  const showFinance = !typeFilter || typeFilter === 'finance'
  const showTimeline = showTickets || showFreight
  const showCashRegisters = !typeFilter || showFinance

  const currencyFilter = apiFilters.currency || undefined

  const kpiItems = stats
    ? buildKpiItems(stats, data?.previous ?? null, {
        currencyFilter,
        exchangeRates,
      }).filter((item) => {
        if (!typeFilter) return true
        if (typeFilter === 'tickets') return item.label === 'Billets' || item.label === 'Revenus totaux'
        if (typeFilter === 'checkIn') return item.label === 'Check-ins' || item.label === 'Revenus totaux'
        if (typeFilter === 'freight') return item.label === 'Expéditions fret' || item.label === 'Revenus totaux'
        if (typeFilter === 'finance') {
          return ['Transactions', 'Revenus totaux', 'Net finance', 'Solde CDF', 'Solde USD'].includes(item.label)
            || item.label.startsWith('Solde ')
        }
        return true
      })
    : []

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">
              Statistiques en temps réel — billetterie, fret, check-in et finance
            </p>
          </div>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground">Mise à jour...</span>
        )}
      </div>

      <DashboardFilters
        filters={filtersState}
        onChange={(patch) => setFiltersState((prev) => ({ ...prev, ...patch }))}
        issuingOfficeOptions={issuingOfficeOptions}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des statistiques..." />
        </div>
      ) : isError || !stats ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Statistiques indisponibles"
          description="Impossible de charger les données depuis l'API /api/stats."
          action={{ label: 'Réessayer', onClick: () => void refetch() }}
        />
      ) : (
        <div className={cn('space-y-6 transition-opacity', isFetching && 'opacity-60')}>
          <StatsKpiGrid items={kpiItems} />

          {showTimeline && (
            <div className="grid gap-6 xl:grid-cols-2">
              <TimelineChart timeline={stats.timeline} />
              <TimelineRevenueChart timeline={stats.timeline} currency={currencyFilter} />
            </div>
          )}

          {(showTickets || showFreight || showCheckIn) && (
            <div className="grid gap-6 lg:grid-cols-3">
              {showTickets && <TicketsStatusChart stats={stats} currency={currencyFilter} />}
              {showFreight && <FreightStatusChart stats={stats} currency={currencyFilter} />}
              {showCheckIn && <CheckInStatusChart stats={stats} currency={currencyFilter} />}
            </div>
          )}

          {showFinance && (
            <FinanceFlowChart
              finance={stats.finance}
              byCurrency={stats.byCurrency}
              currency={currencyFilter}
            />
          )}

          {showFinance && (
            <div className="grid gap-6 xl:grid-cols-2">
              <CurrencyDistributionChart byCurrency={stats.byCurrency} />
              <CurrencyPieChart byCurrency={stats.byCurrency} />
            </div>
          )}

          {!typeFilter && <IssuingOfficeChart offices={stats.byIssuingOffice} />}
          {typeFilter && filtersState.issuingOfficeId && (
            <IssuingOfficeChart offices={stats.byIssuingOffice} />
          )}

          {showCashRegisters && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Mouvements Financiers</h2>
              <CashRegistersSection cashRegisters={stats.cashRegisters} />
            </section>
          )}
        </div>
      )}

      <DashboardRecentActivity
        filters={{ startDate: apiFilters.startDate, endDate: apiFilters.endDate }}
      />
    </div>
  )
}
