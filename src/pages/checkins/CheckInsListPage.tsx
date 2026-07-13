import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  MapPin,
  LayoutGrid,
  Plus,
  Scale,
  Search,
  SlidersHorizontal,
  Table2,
  Ticket,
  User,
  UserCheck,
  X,
  Banknote,
} from 'lucide-react'
import { useCheckIns } from '@/hooks/useCheckIns'
import { CheckInManifestModal } from '@/components/checkins/CheckInManifestModal'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import { CHECK_IN_STATUS, CHECK_IN_STATUS_LABELS } from '@/constants/check-in'
import {
  formatCheckInWeight,
  getCheckInCurrency,
  getCheckInIssuingOfficeLabel,
  getCheckInPassengerName,
  getCheckInTicketNumber,
} from '@/lib/check-in'
import { formatTravelDateInput, getUpcomingFlightTravelDateInput } from '@/lib/ticket'
import {
  checkInFiltersToSearchParams,
  countActiveCheckInFilters,
  DEFAULT_CHECK_IN_LIST_ORDER,
  emptyCheckInFilters,
  parseCheckInFiltersFromSearchParams,
  type CheckInFiltersState,
} from '@/lib/check-in-filters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney, formatDate, formatDateTime, cn } from '@/lib/utils'
import { CURRENCY_LABELS, currencyFilterOptions } from '@/constants/ticket'
import { STORAGE_KEYS } from '@/constants/storage'
import type { CheckIn } from '@/types/check-in'

const ITEMS_PER_PAGE = 15

const filterInputClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

type CheckInViewMode = 'cards' | 'table'

function readCheckInsViewMode(): CheckInViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHECKINS_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: CheckInViewMode
  onChange: (mode: CheckInViewMode) => void
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

const CHECK_IN_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: CHECK_IN_STATUS.CREATED, label: CHECK_IN_STATUS_LABELS.CREATED ?? 'Créé' },
  { value: CHECK_IN_STATUS.CANCELLED, label: CHECK_IN_STATUS_LABELS.CANCELLED ?? 'Annulé' },
]

function CheckInFiltersFields({
  draft,
  onChange,
}: {
  draft: CheckInFiltersState
  onChange: (patch: Partial<CheckInFiltersState>) => void
}) {
  return (
    <div className="space-y-6">
      <FilterSection title="Trajet" icon={MapPin}>
        <CheckpointAsyncSelect
          label="Départ"
          value={draft.departure}
          onChange={(iri) => onChange({ departure: iri })}
          placeholder="Tous les départs"
          variant="filter"
        />
        <CheckpointAsyncSelect
          label="Destination"
          value={draft.destination}
          onChange={(iri) => onChange({ destination: iri })}
          placeholder="Toutes les destinations"
          variant="filter"
        />
        <Input
          label="Date de vol"
          type="date"
          value={draft.travelDate}
          onChange={(e) => onChange({ travelDate: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>
      <FilterSection title="Billet" icon={Ticket}>
        <Input
          label="N° billet"
          placeholder="Ex. TKT-260608-F18D"
          value={draft.ticketNumber}
          onChange={(e) => onChange({ ticketNumber: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>
      <FilterSection title="Passager" icon={User}>
        <Input
          label="Nom du passager"
          placeholder="Recherche partielle..."
          value={draft.passengerName}
          onChange={(e) => onChange({ passengerName: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>
      <FilterSection title="Date" icon={Calendar}>
        <Input
          label="Date du check-in"
          type="date"
          value={draft.createdAt}
          onChange={(e) => onChange({ createdAt: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>
      <FilterSection title="Tarification" icon={Banknote}>
        <Select
          label="Devise"
          variant="filter"
          options={currencyFilterOptions()}
          value={draft.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
        />
        <Select
          label="Statut"
          variant="filter"
          options={CHECK_IN_STATUS_FILTER_OPTIONS}
          value={draft.status}
          onChange={(e) => onChange({ status: e.target.value })}
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

function CheckInCard({ checkIn }: { checkIn: CheckIn }) {
  const netToPay = parseFloat(checkIn.netToPay) || 0
  const passenger = getCheckInPassengerName(checkIn)

  return (
    <Link to={`/checkins/${checkIn.id}`} className="block group">
      <Card className="overflow-hidden border-border/80 shadow-sm transition-all active:scale-[0.99] group-hover:border-brand-orange/40 group-hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <span className="font-mono text-xs font-semibold text-primary truncate block">
                {checkIn.id}
              </span>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold truncate">
                  <Ticket className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />
                  {getCheckInTicketNumber(checkIn)}
                </p>
                {passenger && (
                  <p className="truncate text-sm text-muted-foreground">{passenger}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {getCheckInIssuingOfficeLabel(checkIn)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5 shrink-0" />
                  {checkIn.checkInWeight} kg
                </span>
                {checkIn.createdAt && (
                  <span>{formatDateTime(checkIn.createdAt)}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Net</p>
                <p
                  className={cn(
                    'font-bold text-base tabular-nums',
                    netToPay > 0 ? 'text-brand-orange' : 'text-muted-foreground',
                  )}
                >
                  {formatMoney(netToPay, getCheckInCurrency(checkIn))}
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

function CheckInTable({ checkIns }: { checkIns: CheckIn[] }) {
  const navigate = useNavigate()

  const headClass = 'h-10 px-2 py-2 text-[11px] font-semibold leading-tight whitespace-normal lg:px-3 lg:text-xs'
  const cellClass = 'px-2 py-2.5 text-xs lg:px-3 lg:text-sm'

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(headClass, 'w-[15%]')}>Passager</TableHead>
            <TableHead className={cn(headClass, 'w-[12%]')}>N° billet</TableHead>
            <TableHead className={cn(headClass, 'w-[12%] text-right')}>Poids franchise</TableHead>
            <TableHead className={cn(headClass, 'w-[12%] text-right')}>Poids check-in</TableHead>
            <TableHead className={cn(headClass, 'w-[12%] text-right')}>Bagage à main</TableHead>
            <TableHead className={cn(headClass, 'w-[11%] text-right')}>Excédent</TableHead>
            <TableHead className={cn(headClass, 'w-[12%] text-right')}>Prix excédent</TableHead>
            <TableHead className={cn(headClass, 'w-9 px-1')} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {checkIns.map((checkIn) => {
            const currency = getCheckInCurrency(checkIn)
            const excessPrice = parseFloat(checkIn.excessPrice) || 0

            return (
              <TableRow
                key={checkIn.id}
                className="cursor-pointer"
                onClick={() => void navigate(`/checkins/${checkIn.id}`)}
              >
                <TableCell
                  className={cn(cellClass, 'truncate font-medium')}
                  title={getCheckInPassengerName(checkIn) ?? undefined}
                >
                  {getCheckInPassengerName(checkIn) ?? '—'}
                </TableCell>
                <TableCell className={cn(cellClass, 'truncate font-mono text-[11px] lg:text-xs')} title={getCheckInTicketNumber(checkIn)}>
                  {getCheckInTicketNumber(checkIn)}
                </TableCell>
                <TableCell className={cn(cellClass, 'text-right tabular-nums whitespace-nowrap text-muted-foreground')}>
                  {formatCheckInWeight(checkIn.baggageAllowanceKg)}
                </TableCell>
                <TableCell className={cn(cellClass, 'text-right tabular-nums whitespace-nowrap')}>
                  {formatCheckInWeight(checkIn.checkInWeight)}
                </TableCell>
                <TableCell className={cn(cellClass, 'text-right tabular-nums whitespace-nowrap text-muted-foreground')}>
                  {formatCheckInWeight(checkIn.handBaggageWeight)}
                </TableCell>
                <TableCell className={cn(cellClass, 'text-right tabular-nums whitespace-nowrap')}>
                  {formatCheckInWeight(checkIn.excessWeightKg)}
                </TableCell>
                <TableCell
                  className={cn(
                    cellClass,
                    'text-right font-semibold tabular-nums whitespace-nowrap',
                    excessPrice > 0 ? 'text-brand-orange' : 'text-muted-foreground',
                  )}
                >
                  {formatMoney(excessPrice, currency)}
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

export function CheckInsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [manifestOpen, setManifestOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<CheckInFiltersState>(emptyCheckInFilters)
  const [viewMode, setViewMode] = useState<CheckInViewMode>(readCheckInsViewMode)

  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const filters = useMemo(
    () => parseCheckInFiltersFromSearchParams(searchParams),
    [searchParams],
  )

  const defaultFlightDisabled = searchParams.get('allFlights') === '1'
  const explicitTravelDate = filters.travelDate.trim()
  const activeFlightDate = explicitTravelDate || (defaultFlightDisabled ? '' : getUpcomingFlightTravelDateInput())

  const [searchInput, setSearchInput] = useState(filters.passengerName)

  const buildSearchParams = (
    nextFilters: CheckInFiltersState,
    nextPage?: number,
    disableDefaultFlight = defaultFlightDisabled,
  ) => {
    const next = checkInFiltersToSearchParams(nextFilters, nextPage)
    if (disableDefaultFlight) next.set('allFlights', '1')
    else next.delete('allFlights')
    return next
  }

  useEffect(() => {
    setSearchInput(filters.passengerName)
  }, [filters.passengerName])

  // Recherche rapide passager → ?passengerName=Joh
  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === filters.passengerName) return

    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('passengerName', trimmed)
        else next.delete('passengerName')
        next.delete('page')
        return next
      }, { replace: true })
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput, filters.passengerName, setSearchParams])

  const { data, isLoading, isFetching } = useCheckIns({
    ...filters,
    travelDate: activeFlightDate || undefined,
    ...DEFAULT_CHECK_IN_LIST_ORDER,
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const checkIns = data?.items ?? []

  const activeCount = countActiveCheckInFilters(filters)
  const panelDraftCount = countActiveCheckInFilters(panelDraft)

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
    setPanelDraft({ ...filters, passengerName: searchInput.trim() })
    setFiltersOpen(true)
  }

  const closeFilters = () => setFiltersOpen(false)
  const toggleFilters = () => (filtersOpen ? closeFilters() : openFilters())

  const applyPanelFilters = () => {
    const passengerName = searchInput.trim() || panelDraft.passengerName.trim()
    const next = { ...panelDraft, passengerName }
    setSearchParams(buildSearchParams(next), { replace: true })
    setSearchInput(passengerName)
    setFiltersOpen(false)
  }

  const resetAllFilters = () => {
    setSearchParams(buildSearchParams(emptyCheckInFilters), { replace: true })
    setSearchInput('')
    setPanelDraft(emptyCheckInFilters)
    setFiltersOpen(false)
  }

  const patchFilters = (patch: Partial<CheckInFiltersState>) => {
    const next = { ...filters, ...patch }
    if ('passengerName' in patch) setSearchInput(patch.passengerName ?? '')
    setSearchParams(buildSearchParams(next, page), { replace: true })
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(buildSearchParams(filters, nextPage), { replace: true })
  }

  const handleViewModeChange = (mode: CheckInViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.CHECKINS_VIEW, mode)
    } catch {
      // ignore
    }
  }

  const toggleDefaultFlightFilter = () => {
    setSearchParams(buildSearchParams(filters, 1, !defaultFlightDisabled), { replace: true })
  }

  const flightDateInputRef = useRef<HTMLInputElement>(null)

  const openFlightDatePicker = () => {
    const input = flightDateInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.click()
  }

  const handleFlightDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const travelDate = e.target.value
    if (!travelDate) return
    setSearchParams(buildSearchParams({ ...filters, travelDate }, 1, false), { replace: true })
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
              <UserCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Check-In</h1>
          </div>
          {data && (
            <p className="text-sm text-muted-foreground mt-1 pl-11">
              {data.totalItems} enregistrement{data.totalItems !== 1 ? 's' : ''}
              {' · '}
              <button
                type="button"
                onClick={openFlightDatePicker}
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {activeFlightDate ? `Vol du ${formatTravelDateInput(activeFlightDate)}` : 'Tous les vols'}
              </button>
              <input
                ref={flightDateInputRef}
                type="date"
                value={activeFlightDate || getUpcomingFlightTravelDateInput()}
                onChange={handleFlightDateChange}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
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
          <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
            <Link to="/checkins/new">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nouveau</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:z-auto">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher un passager..."
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={defaultFlightDisabled ? 'outline' : 'default'}
          size="sm"
          className="h-9 rounded-full px-3 shadow-sm"
          onClick={toggleDefaultFlightFilter}
          aria-pressed={!defaultFlightDisabled}
        >
          {defaultFlightDisabled ? 'Activer prochain vol' : 'Désactiver prochain vol'}
        </Button>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Fermer les filtres"
            onClick={closeFilters}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-2xl bg-background shadow-2xl animate-in slide-in-from-bottom duration-200">
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
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <CheckInFiltersFields
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
        <div className={filtersOpen ? 'overflow-visible' : 'overflow-hidden'}>
          <Card className="rounded-2xl border-border/60 bg-muted/20 shadow-sm">
            <CardContent className="p-5 space-y-5">
              <CheckInFiltersFields
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
          {filters.ticketNumber && (
            <FilterChip
              label={`Billet ${filters.ticketNumber}`}
              onRemove={() => patchFilters({ ticketNumber: '' })}
            />
          )}
          {filters.passengerName && (
            <FilterChip
              label={filters.passengerName}
              onRemove={() => patchFilters({ passengerName: '' })}
            />
          )}
          {filters.departure && (
            <FilterChip label="Départ" onRemove={() => patchFilters({ departure: '' })} />
          )}
          {filters.destination && (
            <FilterChip label="Destination" onRemove={() => patchFilters({ destination: '' })} />
          )}
          {explicitTravelDate && (
            <FilterChip
              label={`Vol ${formatTravelDateInput(explicitTravelDate)}`}
              onRemove={() => patchFilters({ travelDate: '' })}
            />
          )}
          {filters.createdAt && (
            <FilterChip
              label={formatDate(filters.createdAt)}
              onRemove={() => patchFilters({ createdAt: '' })}
            />
          )}
          {filters.currency && (
            <FilterChip
              label={CURRENCY_LABELS[filters.currency as keyof typeof CURRENCY_LABELS] ?? filters.currency}
              onRemove={() => patchFilters({ currency: '' })}
            />
          )}
          {filters.status && (
            <FilterChip
              label={CHECK_IN_STATUS_LABELS[filters.status] ?? filters.status}
              onRemove={() => patchFilters({ status: '' })}
            />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des check-ins..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={UserCheck}
          title={activeFlightDate ? 'Aucun check-in pour ce vol' : 'Aucun check-in trouvé'}
          description={
            activeCount > 0
              ? activeFlightDate
                ? `Aucun check-in pour le vol du ${formatTravelDateInput(activeFlightDate)} avec ces filtres.`
                : 'Aucun résultat pour ces filtres.'
              : activeFlightDate
                ? `Aucun check-in pour le vol du ${formatTravelDateInput(activeFlightDate)}.`
                : 'Enregistrez le premier check-in passager.'
          }
          action={{ label: 'Nouveau check-in', onClick: () => { window.location.href = '/checkins/new' } }}
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
            {checkIns.map((checkIn) => (
              <CheckInCard key={checkIn.id} checkIn={checkIn} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <CheckInTable checkIns={checkIns} />
          </div>

          <Pagination
            page={page}
            totalItems={data.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <CheckInManifestModal open={manifestOpen} onOpenChange={setManifestOpen} />
    </div>
  )
}
