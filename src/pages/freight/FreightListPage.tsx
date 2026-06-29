import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Calendar,
  ChevronRight,
  LayoutGrid,
  MapPin,
  Package,
  Plane,
  Plus,
  Scale,
  Search,
  SlidersHorizontal,
  Table2,
  User,
  X,
  FileText,
} from 'lucide-react'
import { FreightManifestModal } from '@/components/freight/FreightManifestModal'
import { useFreight } from '@/hooks/useFreight'
import {
  FREIGHT_PAYMENT_MODE_LABELS,
  FREIGHT_STATUS_LABELS,
  freightPaymentModeFilterOptions,
  freightStatusBadgeVariant,
  freightStatusFilterOptions,
  type FreightPaymentMode,
  type FreightStatus,
} from '@/constants/freight'
import {
  countActiveFreightFilters,
  emptyFreightFilters,
  freightFiltersToSearchParams,
  parseFreightFiltersFromSearchParams,
  type FreightFiltersState,
} from '@/lib/freight-filters'
import { formatFreightWeight } from '@/lib/freight'
import { normalizeCurrency, CURRENCY_LABELS, currencyFilterOptions, type Currency } from '@/constants/ticket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { FreightShipment } from '@/types/freight-shipment'

const ITEMS_PER_PAGE = 15

const filterInputClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

type FreightViewMode = 'cards' | 'table'

function readFreightViewMode(): FreightViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FREIGHT_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: FreightViewMode
  onChange: (mode: FreightViewMode) => void
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

function FilterSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Search
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function FreightFiltersFields({
  draft,
  onChange,
}: {
  draft: FreightFiltersState
  onChange: (patch: Partial<FreightFiltersState>) => void
}) {
  return (
    <div className="space-y-6">
      <FilterSection title="LTA" icon={Package}>
        <Input
          label="N° LTA"
          placeholder="Ex. LTA-2026-001"
          value={draft.ltaNumber}
          onChange={(e) => onChange({ ltaNumber: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>

      <FilterSection title="Transport" icon={Plane}>
        <Input
          label="Compagnie aérienne"
          placeholder="Ex. KAP-AIR"
          value={draft.airline}
          onChange={(e) => onChange({ airline: e.target.value })}
          className={filterInputClass}
        />
        <Input
          label="Date d'expédition"
          type="date"
          value={draft.shipmentDate}
          onChange={(e) => onChange({ shipmentDate: e.target.value })}
          className={filterInputClass}
        />
        <Select
          label="Statut"
          options={freightStatusFilterOptions()}
          value={draft.status}
          onChange={(e) => onChange({ status: e.target.value })}
          variant="filter"
        />
        <Select
          label="Mode de paiement"
          options={freightPaymentModeFilterOptions()}
          value={draft.paymentMode}
          onChange={(e) => onChange({ paymentMode: e.target.value })}
          variant="filter"
          placement="top"
        />
        <Select
          label="Devise"
          options={currencyFilterOptions()}
          value={draft.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
          variant="filter"
          placement="top"
        />
      </FilterSection>

      <FilterSection title="Personnes" icon={User}>
        <Input
          label="Expéditeur"
          placeholder="Nom de l'expéditeur"
          value={draft.senderName}
          onChange={(e) => onChange({ senderName: e.target.value })}
          className={filterInputClass}
        />
        <Input
          label="Destinataire"
          placeholder="Nom du destinataire"
          value={draft.receiverName}
          onChange={(e) => onChange({ receiverName: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>

      <FilterSection title="Trajet" icon={MapPin}>
        <CheckpointAsyncSelect
          label="Lieu de chargement"
          placeholder="Checkpoint de chargement..."
          value={draft.loadingPlace}
          onChange={(iri) => onChange({ loadingPlace: iri })}
          variant="filter"
        />
        <CheckpointAsyncSelect
          label="Lieu de déchargement"
          placeholder="Checkpoint de déchargement..."
          value={draft.unloadingPlace}
          onChange={(iri) => onChange({ unloadingPlace: iri })}
          variant="filter"
        />
      </FilterSection>
    </div>
  )
}

function FilterActions({
  activeCount,
  onApply,
  onReset,
  className,
}: {
  activeCount: number
  onApply: () => void
  onReset: () => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-2', className)}>
      <Button type="button" onClick={onApply} className="flex-1 h-11 rounded-xl font-semibold">
        Appliquer
      </Button>
      {activeCount > 0 && (
        <Button type="button" variant="outline" onClick={onReset} className="h-11 rounded-xl px-4">
          <X className="h-4 w-4" />
          <span className="sr-only">Effacer</span>
        </Button>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary active:bg-primary/20 transition-colors"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  )
}

function FreightCard({ shipment }: { shipment: FreightShipment }) {
  const total = parseFloat(shipment.totalAmount) || 0

  return (
    <Link to={`/freight/${shipment.id}`} className="block group">
      <Card className="overflow-hidden border-border/80 shadow-sm transition-all active:scale-[0.99] group-hover:border-brand-orange/40 group-hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary truncate">
                  {shipment.ltaNumber}
                </span>
                <Badge variant={freightStatusBadgeVariant(shipment.status) as 'default'} className="shrink-0">
                  {FREIGHT_STATUS_LABELS[shipment.status]}
                </Badge>
              </div>
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold truncate">
                <Plane className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />
                {shipment.airline}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(shipment.shipmentDate)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5 shrink-0" />
                  {shipment.totalWeight} kg
                </span>
                <span>{shipment.packageCount} colis</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="font-bold text-base tabular-nums text-brand-orange">
                  {formatMoney(total)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-brand-orange transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function FreightTable({ shipments }: { shipments: FreightShipment[] }) {
  const navigate = useNavigate()

  const headClass = 'h-10 px-2 py-2 text-[11px] font-semibold leading-tight whitespace-normal lg:px-3 lg:text-xs'
  const cellClass = 'px-2 py-2.5 text-xs lg:px-3 lg:text-sm'

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(headClass, 'w-[12%]')}>Expéditeur</TableHead>
            <TableHead className={cn(headClass, 'w-[12%]')}>Destinataire</TableHead>
            <TableHead className={cn(headClass, 'w-[9%]')}>LTA</TableHead>
            <TableHead className={cn(headClass, 'w-[6%] text-right')}>Colis</TableHead>
            <TableHead className={cn(headClass, 'w-[9%] text-right')}>Poids total</TableHead>
            <TableHead className={cn(headClass, 'w-[11%] text-right')}>Montant total</TableHead>
            <TableHead className={cn(headClass, 'w-[10%] text-right')}>Acompte payé</TableHead>
            <TableHead className={cn(headClass, 'w-[10%] text-right')}>Reste à payer</TableHead>
            <TableHead className={cn(headClass, 'w-[9%]')}>Mode paiement</TableHead>
            <TableHead className={cn(headClass, 'w-9 px-1')} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const currency = normalizeCurrency(shipment.currency)
            const totalAmount = parseFloat(shipment.totalAmount) || 0
            const paidAmount = parseFloat(shipment.paidAmount) || 0
            const remainingAmount = parseFloat(shipment.remainingAmount) || 0
            const paymentLabel =
              FREIGHT_PAYMENT_MODE_LABELS[shipment.paymentMode as FreightPaymentMode] ??
              shipment.paymentMode

            return (
              <TableRow
                key={shipment.id}
                className="cursor-pointer"
                onClick={() => void navigate(`/freight/${shipment.id}`)}
              >
                <TableCell
                  className={cn(cellClass, 'truncate font-medium')}
                  title={shipment.senderName}
                >
                  {shipment.senderName || '—'}
                </TableCell>
                <TableCell className={cn(cellClass, 'truncate')} title={shipment.receiverName}>
                  {shipment.receiverName || '—'}
                </TableCell>
                <TableCell className={cn(cellClass, 'truncate font-mono text-[11px] lg:text-xs')} title={shipment.ltaNumber}>
                  {shipment.ltaNumber}
                </TableCell>
                <TableCell className={cn(cellClass, 'text-right tabular-nums whitespace-nowrap')}>
                  {shipment.packageCount}
                </TableCell>
                <TableCell className={cn(cellClass, 'text-right tabular-nums whitespace-nowrap')}>
                  {formatFreightWeight(shipment.totalWeight)}
                </TableCell>
                <TableCell className={cn(cellClass, 'text-right font-semibold tabular-nums whitespace-nowrap text-brand-orange')}>
                  {formatMoney(totalAmount, currency)}
                </TableCell>
                <TableCell className={cn(cellClass, 'text-right tabular-nums whitespace-nowrap text-muted-foreground')}>
                  {formatMoney(paidAmount, currency)}
                </TableCell>
                <TableCell
                  className={cn(
                    cellClass,
                    'text-right font-medium tabular-nums whitespace-nowrap',
                    remainingAmount > 0 ? 'text-brand-orange' : 'text-muted-foreground',
                  )}
                >
                  {formatMoney(remainingAmount, currency)}
                </TableCell>
                <TableCell className={cn(cellClass, 'truncate text-muted-foreground')} title={paymentLabel}>
                  {paymentLabel}
                </TableCell>
                <TableCell className={cn(cellClass, 'w-9 px-1')}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function FreightListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [manifestOpen, setManifestOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<FreightFiltersState>(emptyFreightFilters)
  const [viewMode, setViewMode] = useState<FreightViewMode>(readFreightViewMode)

  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const filters = useMemo(
    () => parseFreightFiltersFromSearchParams(searchParams),
    [searchParams],
  )

  const [searchInput, setSearchInput] = useState(filters.ltaNumber)

  useEffect(() => {
    setSearchInput(filters.ltaNumber)
  }, [filters.ltaNumber])

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === filters.ltaNumber) return

    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('ltaNumber', trimmed)
        else next.delete('ltaNumber')
        next.delete('page')
        return next
      }, { replace: true })
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput, filters.ltaNumber, setSearchParams])

  const { data, isLoading, isFetching } = useFreight({
    ...filters,
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const activeCount = countActiveFreightFilters(filters)
  const panelDraftCount = countActiveFreightFilters(panelDraft)

  useEffect(() => {
    if (!filtersOpen) return

    const desktopQuery = window.matchMedia('(min-width: 1024px)')
    const syncBodyScroll = () => {
      document.body.style.overflow = filtersOpen && !desktopQuery.matches ? 'hidden' : ''
    }

    syncBodyScroll()
    desktopQuery.addEventListener('change', syncBodyScroll)
    return () => {
      desktopQuery.removeEventListener('change', syncBodyScroll)
      document.body.style.overflow = ''
    }
  }, [filtersOpen])

  const openFilters = () => {
    setPanelDraft({ ...filters, ltaNumber: searchInput.trim() })
    setFiltersOpen(true)
  }

  const closeFilters = () => setFiltersOpen(false)
  const toggleFilters = () => (filtersOpen ? closeFilters() : openFilters())

  const applyPanelFilters = () => {
    const ltaNumber = searchInput.trim() || panelDraft.ltaNumber.trim()
    const next = { ...panelDraft, ltaNumber }
    setSearchParams(freightFiltersToSearchParams(next), { replace: true })
    setSearchInput(ltaNumber)
    setFiltersOpen(false)
  }

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
    setSearchInput('')
    setPanelDraft(emptyFreightFilters)
    setFiltersOpen(false)
  }

  const patchFilters = (patch: Partial<FreightFiltersState>) => {
    const next = { ...filters, ...patch }
    if ('ltaNumber' in patch) setSearchInput(patch.ltaNumber ?? '')
    setSearchParams(freightFiltersToSearchParams(next, page), { replace: true })
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(freightFiltersToSearchParams(filters, nextPage), { replace: true })
  }

  const handleViewModeChange = (mode: FreightViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.FREIGHT_VIEW, mode)
    } catch {
      // ignore
    }
  }

  return (
    <div
      className={cn(
        'mx-auto space-y-4',
        viewMode === 'table' ? 'w-full max-w-none' : 'max-w-3xl lg:max-w-5xl',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Fret</h1>
          </div>
          {data && (
            <p className="text-sm text-muted-foreground mt-1 pl-11">
              {data.totalItems} expédition{data.totalItems !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full px-3 shadow-sm"
            onClick={() => setManifestOpen(true)}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Manifeste PDF</span>
          </Button>
          <Button asChild size="sm" className="shrink-0 rounded-full px-4 shadow-sm">
            <Link to="/freight/new">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nouvelle</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:z-auto">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher un N° LTA..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-input"
            />
          </div>
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
          <Button
            type="button"
            variant={filtersOpen ? 'default' : 'outline'}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl relative"
            onClick={toggleFilters}
            aria-label="Filtres"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Fermer les filtres"
            onClick={closeFilters}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] min-h-0 flex-col rounded-t-2xl bg-background shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex shrink-0 flex-col items-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b px-4 pb-3 pt-1">
              <div>
                <h2 className="font-semibold text-base">Filtres</h2>
                {panelDraftCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {panelDraftCount} sélectionné{panelDraftCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={closeFilters}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 touch-pan-y">
              <FreightFiltersFields
                draft={panelDraft}
                onChange={(patch) => setPanelDraft((prev) => ({ ...prev, ...patch }))}
              />
            </div>
            <div className="shrink-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <FilterActions
                activeCount={panelDraftCount}
                onApply={applyPanelFilters}
                onReset={resetAllFilters}
              />
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          'hidden lg:grid transition-all duration-200 ease-out',
          filtersOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none',
        )}
      >
        <div className={cn('min-h-0', filtersOpen ? 'overflow-y-auto max-h-[min(70dvh,calc(100dvh-11rem))]' : 'overflow-hidden')}>
          <Card className="rounded-2xl border-border/60 bg-muted/20 shadow-sm">
            <CardContent className="space-y-5 p-5">
              <FreightFiltersFields
                draft={panelDraft}
                onChange={(patch) => setPanelDraft((prev) => ({ ...prev, ...patch }))}
              />
              <FilterActions
                activeCount={panelDraftCount}
                onApply={applyPanelFilters}
                onReset={resetAllFilters}
                className="justify-end border-t pt-4"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.ltaNumber && (
            <FilterChip
              label={`LTA ${filters.ltaNumber}`}
              onRemove={() => patchFilters({ ltaNumber: '' })}
            />
          )}
          {filters.airline && (
            <FilterChip
              label={filters.airline}
              onRemove={() => patchFilters({ airline: '' })}
            />
          )}
          {filters.shipmentDate && (
            <FilterChip
              label={formatDate(filters.shipmentDate)}
              onRemove={() => patchFilters({ shipmentDate: '' })}
            />
          )}
          {filters.status && (
            <FilterChip
              label={FREIGHT_STATUS_LABELS[filters.status as FreightStatus]}
              onRemove={() => patchFilters({ status: '' })}
            />
          )}
          {filters.paymentMode && (
            <FilterChip
              label={FREIGHT_PAYMENT_MODE_LABELS[filters.paymentMode as FreightPaymentMode]}
              onRemove={() => patchFilters({ paymentMode: '' })}
            />
          )}
          {filters.currency && (
            <FilterChip
              label={CURRENCY_LABELS[filters.currency as Currency]}
              onRemove={() => patchFilters({ currency: '' })}
            />
          )}
          {filters.senderName && (
            <FilterChip
              label={`Exp. ${filters.senderName}`}
              onRemove={() => patchFilters({ senderName: '' })}
            />
          )}
          {filters.receiverName && (
            <FilterChip
              label={`Dest. ${filters.receiverName}`}
              onRemove={() => patchFilters({ receiverName: '' })}
            />
          )}
          {(filters.loadingPlace || filters.unloadingPlace) && (
            <FilterChip
              label="Trajet"
              onRemove={() => patchFilters({ loadingPlace: '', unloadingPlace: '' })}
            />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des expéditions..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Package}
          title="Aucune expédition trouvée"
          description={
            activeCount > 0
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez votre première expédition fret.'
          }
          action={{ label: 'Nouvelle expédition', onClick: () => { window.location.href = '/freight/new' } }}
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
            {data.items.map((shipment) => (
              <FreightCard key={shipment.id} shipment={shipment} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <FreightTable shipments={data.items} />
          </div>

          <Pagination
            page={page}
            totalItems={data.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <FreightManifestModal open={manifestOpen} onOpenChange={setManifestOpen} />
    </div>
  )
}
