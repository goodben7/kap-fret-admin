import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CHART_COLORS, CHART_PALETTE, financeCategoryChartData, formatFreightRevenue, formatStatsRevenueByCurrency, freightStatusChartData, ticketStatusChartData } from '@/lib/stats'
import { formatMoney } from '@/lib/utils'
import { CURRENCY, type Currency } from '@/constants/ticket'
import type { AppStats } from '@/types/stats'

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={`rounded-2xl border-border/80 shadow-sm ${className ?? ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[]
  label?: string
  valueFormatter?: (value: number, name?: string, row?: Record<string, unknown>) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold">
            {valueFormatter
              ? valueFormatter(entry.value ?? 0, entry.name, entry.payload)
              : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

const chartMargin = { top: 8, right: 8, left: 0, bottom: 0 }

export function TimelineChart({ timeline }: { timeline: AppStats['timeline'] }) {
  if (!timeline.length) {
    return (
      <ChartCard title="Évolution temporelle" description="Tickets et fret — volume et revenus">
        <p className="py-12 text-center text-sm text-muted-foreground">Aucune donnée sur la période</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Évolution temporelle" description="Tickets et fret — volume et revenus">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline} margin={chartMargin}>
            <defs>
              <linearGradient id="ticketsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.ticket} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_COLORS.ticket} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="freightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.freight} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_COLORS.freight} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="tickets"
              name="Billets"
              stroke={CHART_COLORS.ticket}
              fill="url(#ticketsGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="freight"
              name="Fret"
              stroke={CHART_COLORS.freight}
              fill="url(#freightGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function TimelineRevenueChart({
  timeline,
  currency,
}: {
  timeline: AppStats['timeline']
  currency?: Currency
}) {
  if (!timeline.length) return null

  const displayCurrency = currency ?? CURRENCY.CDF

  return (
    <ChartCard title="Revenus mensuels" description="Billetterie et fret">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={
                <ChartTooltip valueFormatter={(value) => formatMoney(value, displayCurrency)} />
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="ticketsRevenue"
              name="Revenus billets"
              stroke={CHART_COLORS.ticket}
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="freightRevenue"
              name="Revenus fret"
              stroke={CHART_COLORS.freight}
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function StatusBarChart({
  title,
  description,
  data,
}: {
  title: string
  description?: string
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title={title} description={description}>
        <p className="py-10 text-center text-sm text-muted-foreground">Aucune donnée</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title={title} description={description}>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={88}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Nombre" radius={[0, 6, 6, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function TicketsStatusChart({
  stats,
  currency,
}: {
  stats: AppStats
  currency?: Currency
}) {
  return (
    <StatusBarChart
      title="Statut des billets"
      description={`${stats.tickets.total} billets · ${formatStatsRevenueByCurrency(stats.tickets.revenueCdf, stats.tickets.revenueUsd, currency)}`}
      data={ticketStatusChartData(stats.tickets.byStatus)}
    />
  )
}

export function FreightStatusChart({
  stats,
  currency,
}: {
  stats: AppStats
  currency?: Currency
}) {
  return (
    <StatusBarChart
      title="Statut du fret"
      description={`${stats.freight.total} expéditions · ${formatFreightRevenue(stats.freight, currency)}`}
      data={freightStatusChartData(stats.freight.byStatus)}
    />
  )
}

export function CheckInStatusChart({
  stats,
  currency,
}: {
  stats: AppStats
  currency?: Currency
}) {
  const data = Object.entries(stats.checkIn.byStatus).map(([key, value]) => ({
    label: key === 'CREATED' ? 'Créés' : key,
    value,
  }))

  const weightLabel = stats.checkIn.totalWeight > 0
    ? ` · ${stats.checkIn.totalWeight.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`
    : ''

  return (
    <StatusBarChart
      title="Check-in"
      description={`${stats.checkIn.total} check-ins${weightLabel} · ${formatStatsRevenueByCurrency(stats.checkIn.revenueCdf, stats.checkIn.revenueUsd, currency)}`}
      data={data}
    />
  )
}

export function CurrencyDistributionChart({ byCurrency }: { byCurrency: AppStats['byCurrency'] }) {
  if (!byCurrency.length) {
    return (
      <ChartCard title="Flux par devise" description="Entrées, sorties et net">
        <p className="py-10 text-center text-sm text-muted-foreground">Aucune donnée</p>
      </ChartCard>
    )
  }

  const barData = byCurrency.map((item) => ({
    currency: item.currency,
    Entrées: item.entries,
    Sorties: item.exits,
    Net: item.net,
  }))

  return (
    <ChartCard title="Flux par devise" description="Entrées, sorties et net">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="currency" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(value, _name, row) =>
                    formatMoney(
                      value,
                      typeof row?.currency === 'string' ? (row.currency as Currency) : CURRENCY.CDF,
                    )
                  }
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Entrées" fill={CHART_COLORS.entry} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Sorties" fill={CHART_COLORS.exit} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Net" fill={CHART_COLORS.navy} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function CurrencyPieChart({ byCurrency }: { byCurrency: AppStats['byCurrency'] }) {
  const pieData = byCurrency
    .filter((item) => item.net > 0)
    .map((item) => ({ name: item.currency, value: item.net }))

  if (!pieData.length) {
    return (
      <ChartCard title="Répartition nette" description="Par devise">
        <p className="py-10 text-center text-sm text-muted-foreground">Aucune donnée</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Répartition nette" description="Par devise">
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={3}
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.name === CURRENCY.USD ? CHART_COLORS.usd : CHART_COLORS.cdf}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(value, name) =>
                    formatMoney(value, name === CURRENCY.USD ? CURRENCY.USD : CURRENCY.CDF)
                  }
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function FinanceFlowChart({
  finance,
  byCurrency,
  currency,
}: {
  finance: AppStats['finance']
  byCurrency: AppStats['byCurrency']
  currency?: Currency
}) {
  const categoryData = financeCategoryChartData(finance.byType)
  const rows = currency
    ? byCurrency.filter((row) => row.currency === currency)
    : byCurrency

  const summaryData = rows.length > 0
    ? rows.flatMap((row) => [
        { label: `Entrées ${row.currency}`, value: row.entries, color: CHART_COLORS.entry, currency: row.currency },
        { label: `Sorties ${row.currency}`, value: row.exits, color: CHART_COLORS.exit, currency: row.currency },
        { label: `Net ${row.currency}`, value: row.net, color: CHART_COLORS.navy, currency: row.currency },
      ])
    : [
        { label: 'Entrées', value: finance.entriesAmount, color: CHART_COLORS.entry, currency: currency ?? CURRENCY.CDF },
        { label: 'Sorties', value: finance.exitsAmount, color: CHART_COLORS.exit, currency: currency ?? CURRENCY.CDF },
        { label: 'Net', value: finance.netAmount, color: CHART_COLORS.navy, currency: currency ?? CURRENCY.CDF },
      ]

  return (
    <ChartCard
      title="Finance"
      description={`${finance.entriesCount} entrées · ${finance.exitsCount} sorties`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    valueFormatter={(value, _name, row) => {
                      const rowCurrency = typeof row?.currency === 'string'
                        ? (row.currency as Currency)
                        : CURRENCY.CDF
                      return formatMoney(value, rowCurrency)
                    }}
                  />
                }
              />
              <Bar dataKey="value" name="Montant" radius={[6, 6, 0, 0]}>
                {summaryData.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-[220px] w-full">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.map((d) => ({ name: d.label, value: d.value }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Aucune répartition par catégorie
            </p>
          )}
        </div>
      </div>
    </ChartCard>
  )
}

export function IssuingOfficeChart({ offices }: { offices: AppStats['byIssuingOffice'] }) {
  if (!offices.length) {
    return (
      <ChartCard title="Par bureau émetteur" description="Revenus et volume">
        <p className="py-10 text-center text-sm text-muted-foreground">Aucune donnée</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Par bureau émetteur" description="Revenus et volume">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={offices} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="count" name="Transactions" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="revenue" name="Revenus" fill={CHART_COLORS.navy} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
