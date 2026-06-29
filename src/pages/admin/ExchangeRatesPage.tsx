import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowLeftRight,
  Calendar,
  ChevronRight,
  LayoutGrid,
  Plus,
  Table2,
} from 'lucide-react'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatExchangeRateEquation, formatExchangeRatePair } from '@/lib/exchange-rate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { ExchangeRateResource } from '@/types/exchange-rate'

const ITEMS_PER_PAGE = 20

type ExchangeRatesViewMode = 'cards' | 'table'

function readExchangeRatesViewMode(): ExchangeRatesViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ExchangeRatesViewMode
  onChange: (mode: ExchangeRatesViewMode) => void
}) {
  return (
    <div
      className="hidden lg:flex items-center rounded-xl border border-border/80 bg-muted/40 p-1"
      role="group"
      aria-label="Mode d'affichage"
    >
      <Button
        type="button"
        variant={value === 'cards' ? 'default' : 'ghost'}
        size="icon"
        className={cn('h-9 w-9 rounded-lg', value === 'cards' && 'shadow-sm')}
        onClick={() => onChange('cards')}
        aria-label="Affichage cartes"
        aria-pressed={value === 'cards'}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={value === 'table' ? 'default' : 'ghost'}
        size="icon"
        className={cn('h-9 w-9 rounded-lg', value === 'table' && 'shadow-sm')}
        onClick={() => onChange('table')}
        aria-label="Affichage tableau"
        aria-pressed={value === 'table'}
      >
        <Table2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function ExchangeRateCard({ rate }: { rate: ExchangeRateResource }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/admin/exchange-rates/${rate.id}`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm font-bold text-primary">{formatExchangeRatePair(rate)}</p>
                <Badge variant={rate.active ? 'success' : 'destructive'} className="shrink-0">
                  {rate.active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="text-sm font-medium">{formatExchangeRateEquation(rate)}</p>
              <p className="text-xs text-muted-foreground">
                Taux calculé : <span className="font-mono tabular-nums">{rate.rate}</span>
              </p>
              {rate.createdAt && (
                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(rate.createdAt)}
                </p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-orange" />
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

function ExchangeRateTable({ rates }: { rates: ExchangeRateResource[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Paire</TableHead>
            <TableHead>Équivalence</TableHead>
            <TableHead className="hidden md:table-cell">Taux</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((rate) => (
            <TableRow key={rate.id}>
              <TableCell
                className="cursor-pointer font-mono font-semibold"
                onClick={() => void navigate(`/admin/exchange-rates/${rate.id}`)}
              >
                {formatExchangeRatePair(rate)}
              </TableCell>
              <TableCell
                className="cursor-pointer"
                onClick={() => void navigate(`/admin/exchange-rates/${rate.id}`)}
              >
                {formatExchangeRateEquation(rate)}
              </TableCell>
              <TableCell className="hidden md:table-cell font-mono text-xs tabular-nums">
                {rate.rate}
              </TableCell>
              <TableCell>
                <Badge variant={rate.active ? 'success' : 'destructive'}>
                  {rate.active ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/exchange-rates/${rate.id}`}>Voir</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ExchangeRatesPage() {
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ExchangeRatesViewMode>(readExchangeRatesViewMode)

  const { data, isLoading, isFetching } = useExchangeRates({
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const handleViewModeChange = (mode: ExchangeRatesViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES_VIEW, mode)
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-6 lg:max-w-5xl">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Administration
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Taux de change</h1>
          </div>
          {data && (
            <p className="pl-11 text-sm text-muted-foreground">
              {data.totalItems} taux{data.totalItems !== 1 ? '' : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
          <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
            <Link to="/admin/exchange-rates/new">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nouveau</span>
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des taux de change..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Aucun taux de change"
          description="Créez un taux pour convertir entre les devises du bureau."
          action={{ label: 'Nouveau taux', onClick: () => { window.location.href = '/admin/exchange-rates/new' } }}
        />
      ) : (
        <>
          <div
            className={cn(
              'space-y-3',
              viewMode === 'table' && 'lg:hidden',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            {data.items.map((rate) => (
              <ExchangeRateCard key={rate.id} rate={rate} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <ExchangeRateTable rates={data.items} />
          </div>

          <Pagination
            page={page}
            totalItems={data.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
