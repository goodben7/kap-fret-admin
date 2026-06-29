import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  Calendar,
  ChevronRight,
  LayoutGrid,
  Plus,
  Star,
  Table2,
} from 'lucide-react'
import { useCurrencies } from '@/hooks/useCurrencies'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { getCurrencyIssuingOfficeLabel } from '@/lib/currency-resource'
import { formatDate, cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { CurrencyResource } from '@/types/currency-resource'

const ITEMS_PER_PAGE = 20

type CurrenciesViewMode = 'cards' | 'table'

function readCurrenciesViewMode(): CurrenciesViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENCIES_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: CurrenciesViewMode
  onChange: (mode: CurrenciesViewMode) => void
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

function CurrencyCard({ currency }: { currency: CurrencyResource }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/admin/currencies/${currency.id}`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-lg font-bold text-primary">{currency.code}</p>
                <span className="text-lg font-semibold text-muted-foreground">{currency.symbol}</span>
                {currency.isDefault && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Par défaut
                  </Badge>
                )}
                <Badge variant={currency.active ? 'success' : 'destructive'} className="shrink-0">
                  {currency.active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="font-medium truncate">{currency.label}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{getCurrencyIssuingOfficeLabel(currency)}</span>
                {currency.createdAt && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(currency.createdAt)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-orange" />
          </div>
        </Link>

        <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/currencies/${currency.id}`}>Voir</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/currencies/${currency.id}/edit`}>Modifier</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CurrencyTable({ currencies }: { currencies: CurrencyResource[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Code</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead>Symbole</TableHead>
            <TableHead className="hidden md:table-cell">Bureau</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currencies.map((currency) => (
            <TableRow key={currency.id}>
              <TableCell
                className="cursor-pointer font-mono font-semibold"
                onClick={() => void navigate(`/admin/currencies/${currency.id}`)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {currency.code}
                  {currency.isDefault && <Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />}
                </span>
              </TableCell>
              <TableCell
                className="cursor-pointer"
                onClick={() => void navigate(`/admin/currencies/${currency.id}`)}
              >
                {currency.label}
              </TableCell>
              <TableCell className="tabular-nums">{currency.symbol}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm truncate max-w-[10rem]">
                {getCurrencyIssuingOfficeLabel(currency)}
              </TableCell>
              <TableCell>
                <Badge variant={currency.active ? 'success' : 'destructive'}>
                  {currency.active ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/currencies/${currency.id}`}>Voir</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/currencies/${currency.id}/edit`}>Modifier</Link>
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

export function CurrenciesPage() {
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<CurrenciesViewMode>(readCurrenciesViewMode)

  const { data, isLoading, isFetching } = useCurrencies({
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const handleViewModeChange = (mode: CurrenciesViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENCIES_VIEW, mode)
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
              <Banknote className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Devises</h1>
          </div>
          {data && (
            <p className="pl-11 text-sm text-muted-foreground">
              {data.totalItems} devise{data.totalItems !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
          <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
            <Link to="/admin/currencies/new">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nouvelle</span>
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des devises..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Banknote}
          title="Aucune devise"
          description="Créez les devises utilisées pour les billets, check-ins et expéditions fret."
          action={{ label: 'Nouvelle devise', onClick: () => { window.location.href = '/admin/currencies/new' } }}
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
            {data.items.map((currency) => (
              <CurrencyCard key={currency.id} currency={currency} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <CurrencyTable currencies={data.items} />
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
