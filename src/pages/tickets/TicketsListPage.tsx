import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  SlidersHorizontal,
  X,
  ChevronRight,
  Calendar,
  Phone,
  Ticket,
  MapPin,
  CreditCard,
  LayoutGrid,
  Table2,
  FileText,
} from 'lucide-react'
import { useTickets } from '@/hooks/useTickets'
import {
  GENDER_LABELS,
  PAYMENT_MODE_LABELS,
  CURRENCY_LABELS,
  currencyFilterOptions,
  paymentModeFilterOptions,
  TICKET_STATUS,
  TICKET_STATUS_LABELS,
  type Currency,
  type TicketStatus,
} from '@/constants/ticket'
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
import { getTicketTotal } from '@/lib/ticket'
import {
  countActiveTicketFilters,
  emptyTicketFilters,
  parseTicketFiltersFromSearchParams,
  ticketFiltersToSearchParams,
  type TicketFiltersState,
} from '@/lib/ticket-filters'
import type { Ticket as TicketType } from '@/types/ticket'
import { STORAGE_KEYS } from '@/constants/storage'
import { PassengerManifestModal } from '@/components/tickets/PassengerManifestModal'

const ITEMS_PER_PAGE = 15

type TicketViewMode = 'cards' | 'table'

function readTicketsViewMode(): TicketViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TICKETS_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

const filterInputClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

function statusVariant(status: TicketStatus) {
  if (status === TICKET_STATUS.ISSUED) return 'default'
  if (status === TICKET_STATUS.RESERVED) return 'warning'
  if (status === TICKET_STATUS.USED) return 'success'
  if (status === TICKET_STATUS.REFUNDED) return 'secondary'
  return 'destructive'
}

function TicketCard({ ticket }: { ticket: TicketType }) {
  return (
    <Link to={`/tickets/${ticket.id}`} className="block group">
      <Card className="overflow-hidden border-border/80 shadow-sm transition-all active:scale-[0.99] group-hover:border-brand-orange/40 group-hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary truncate">
                  {ticket.ticketNumber}
                </span>
                <Badge variant={statusVariant(ticket.status) as 'default'} className="shrink-0">
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
              </div>
              <p className="font-semibold text-base leading-tight truncate">{ticket.passengerName}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(ticket.travelDate)}
                </span>
                {ticket.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {ticket.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <p className="font-bold text-base tabular-nums">{formatMoney(getTicketTotal(ticket), ticket.currency)}</p>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-brand-orange transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function TicketTable({ tickets }: { tickets: TicketType[] }) {
  const navigate = useNavigate()

  const openTicket = (id: string) => {
    void navigate(`/tickets/${id}`)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/80">
            <TableHead className="font-semibold text-foreground/80">N° billet</TableHead>
            <TableHead className="font-semibold text-foreground/80">Passager</TableHead>
            <TableHead className="font-semibold text-foreground/80">Statut</TableHead>
            <TableHead className="hidden sm:table-cell font-semibold text-foreground/80">Date</TableHead>
            <TableHead className="hidden md:table-cell font-semibold text-foreground/80">Téléphone</TableHead>
            <TableHead className="text-right font-semibold text-foreground/80">Montant</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow
              key={ticket['@id']}
              className="cursor-pointer transition-colors hover:bg-brand-orange/5 active:bg-brand-orange/10"
              onClick={() => openTicket(ticket.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openTicket(ticket.id)
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`Voir le billet ${ticket.ticketNumber}`}
            >
              <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                {ticket.ticketNumber}
              </TableCell>
              <TableCell className="font-medium max-w-[180px] truncate">{ticket.passengerName}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(ticket.status) as 'default'} className="whitespace-nowrap">
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground whitespace-nowrap">
                {formatDate(ticket.travelDate)}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground whitespace-nowrap">
                {ticket.phone ?? '—'}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                {formatMoney(getTicketTotal(ticket), ticket.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground/50">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: TicketViewMode
  onChange: (mode: TicketViewMode) => void
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

function FilterSection({ title, icon: Icon, children }: {
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

function TicketFiltersFields({
  draft,
  onChange,
  layout = 'stack',
}: {
  draft: TicketFiltersState
  onChange: (patch: Partial<TicketFiltersState>) => void
  layout?: 'stack' | 'grid'
}) {
  const identity = (
    <FilterSection title="Identité" icon={Search}>
      <Input
        label="N° billet"
        placeholder="Ex. TKT-260608-5B6F"
        value={draft.ticketNumber}
        onChange={(e) => onChange({ ticketNumber: e.target.value })}
        className={filterInputClass}
      />
      <Input
        label="Téléphone"
        type="tel"
        placeholder="+243..."
        value={draft.phone}
        onChange={(e) => onChange({ phone: e.target.value })}
        className={filterInputClass}
      />
    </FilterSection>
  )

  const travel = (
    <FilterSection title="Voyage" icon={MapPin}>
      <Input
        label="Date de voyage"
        type="date"
        value={draft.travelDate}
        onChange={(e) => onChange({ travelDate: e.target.value })}
        className={filterInputClass}
      />
      <CheckpointAsyncSelect
        label="Départ"
        placeholder="Checkpoint de départ..."
        value={draft.departure}
        onChange={(iri) => onChange({ departure: iri })}
        variant="filter"
      />
      <CheckpointAsyncSelect
        label="Destination"
        placeholder="Checkpoint de destination..."
        value={draft.destination}
        onChange={(iri) => onChange({ destination: iri })}
        variant="filter"
      />
    </FilterSection>
  )

  const details = (
    <FilterSection title="Détails" icon={CreditCard}>
      <Select
        label="Statut"
        variant="filter"
        options={[
          { value: '', label: 'Tous les statuts' },
          ...Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({ value, label })),
        ]}
        value={draft.status}
        onChange={(e) => onChange({ status: e.target.value })}
      />
      <Select
        label="Sexe"
        variant="filter"
        options={[
          { value: '', label: 'Tous' },
          ...Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label })),
        ]}
        value={draft.gender}
        onChange={(e) => onChange({ gender: e.target.value })}
      />
      <Select
        label="Mode de paiement"
        variant="filter"
        placement="top"
        options={paymentModeFilterOptions()}
        value={draft.paymentMode}
        onChange={(e) => onChange({ paymentMode: e.target.value })}
      />
      <Select
        label="Devise"
        variant="filter"
        placement="top"
        options={currencyFilterOptions()}
        value={draft.currency}
        onChange={(e) => onChange({ currency: e.target.value })}
      />
    </FilterSection>
  )

  if (layout === 'grid') {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {identity}
        {travel}
        {details}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {identity}
      {travel}
      {details}
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

export function TicketsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [manifestOpen, setManifestOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<TicketFiltersState>(emptyTicketFilters)
  const [viewMode, setViewMode] = useState<TicketViewMode>(readTicketsViewMode)

  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const filters = useMemo(
    () => parseTicketFiltersFromSearchParams(searchParams),
    [searchParams],
  )

  const [searchInput, setSearchInput] = useState(filters.passengerName)

  useEffect(() => {
    setSearchInput(filters.passengerName)
  }, [filters.passengerName])

  // Recherche passager → ?passengerName=Joh
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

  const { data, isLoading, isFetching } = useTickets({
    ...filters,
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const activeCount = countActiveTicketFilters(filters)
  const panelDraftCount = countActiveTicketFilters(panelDraft)

  useEffect(() => {
    if (!filtersOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [filtersOpen])

  const openFilters = () => {
    setPanelDraft({ ...filters, passengerName: searchInput.trim() })
    setFiltersOpen(true)
  }

  const closeFilters = () => setFiltersOpen(false)

  const toggleFilters = () => {
    if (filtersOpen) closeFilters()
    else openFilters()
  }

  const updatePanelDraft = (patch: Partial<TicketFiltersState>) => {
    setPanelDraft((prev) => ({ ...prev, ...patch }))
  }

  const applyPanelFilters = () => {
    const passengerName = searchInput.trim() || panelDraft.passengerName.trim()
    const next = { ...panelDraft, passengerName }
    setSearchParams(ticketFiltersToSearchParams(next), { replace: true })
    setSearchInput(passengerName)
    setFiltersOpen(false)
  }

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
    setSearchInput('')
    setPanelDraft(emptyTicketFilters)
    setFiltersOpen(false)
  }

  const patchFilters = (patch: Partial<TicketFiltersState>) => {
    const next = { ...filters, ...patch }
    if ('passengerName' in patch) setSearchInput(patch.passengerName ?? '')
    setSearchParams(ticketFiltersToSearchParams(next, page), { replace: true })
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(ticketFiltersToSearchParams(filters, nextPage), { replace: true })
  }

  const handleViewModeChange = (mode: TicketViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.TICKETS_VIEW, mode)
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Billetterie</h1>
          </div>
          {data && (
            <p className="text-sm text-muted-foreground mt-1 pl-11">
              {data.totalItems} billet{data.totalItems !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full px-3 shadow-sm"
            onClick={() => setManifestOpen(true)}
          >
            <FileText className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Manifeste PDF</span>
          </Button>
          <Button asChild size="sm" className="shrink-0 rounded-full px-4 shadow-sm">
            <Link to="/tickets/new">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nouveau</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Barre recherche */}
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

      {/* Mobile : bottom sheet */}
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
                  <p className="text-xs text-muted-foreground">{panelDraftCount} sélectionné{panelDraftCount > 1 ? 's' : ''}</p>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={closeFilters}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <TicketFiltersFields draft={panelDraft} onChange={updatePanelDraft} />
            </div>
            <div className="shrink-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <FilterActions activeCount={panelDraftCount} onApply={applyPanelFilters} onReset={resetAllFilters} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop : panneau inline */}
      <div
        className={cn(
          'hidden lg:grid transition-all duration-200 ease-out',
          filtersOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none',
        )}
      >
        <div className={filtersOpen ? 'overflow-visible' : 'overflow-hidden'}>
          <Card className="rounded-2xl border-border/60 bg-muted/20 shadow-sm">
            <CardContent className="p-5 space-y-5">
              <TicketFiltersFields draft={panelDraft} onChange={updatePanelDraft} layout="grid" />
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

      {/* Filtres actifs */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.ticketNumber && (
            <FilterChip label={`N° ${filters.ticketNumber}`} onRemove={() => patchFilters({ ticketNumber: '' })} />
          )}
          {filters.passengerName && (
            <FilterChip label={filters.passengerName} onRemove={() => patchFilters({ passengerName: '' })} />
          )}
          {filters.phone && (
            <FilterChip label={filters.phone} onRemove={() => patchFilters({ phone: '' })} />
          )}
          {filters.travelDate && (
            <FilterChip label={formatDate(filters.travelDate)} onRemove={() => patchFilters({ travelDate: '' })} />
          )}
          {filters.status && (
            <FilterChip
              label={TICKET_STATUS_LABELS[filters.status as TicketStatus]}
              onRemove={() => patchFilters({ status: '' })}
            />
          )}
          {filters.gender && (
            <FilterChip
              label={GENDER_LABELS[filters.gender as keyof typeof GENDER_LABELS]}
              onRemove={() => patchFilters({ gender: '' })}
            />
          )}
          {filters.paymentMode && (
            <FilterChip
              label={PAYMENT_MODE_LABELS[filters.paymentMode as keyof typeof PAYMENT_MODE_LABELS]}
              onRemove={() => patchFilters({ paymentMode: '' })}
            />
          )}
          {filters.currency && (
            <FilterChip
              label={CURRENCY_LABELS[filters.currency as Currency]}
              onRemove={() => patchFilters({ currency: '' })}
            />
          )}
          {(filters.departure || filters.destination) && (
            <FilterChip label="Trajet" onRemove={() => patchFilters({ departure: '', destination: '' })} />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des billets..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Ticket}
          title="Aucun billet trouvé"
          description="Modifiez vos filtres ou créez un nouveau billet."
          action={{ label: 'Nouveau billet', onClick: () => { window.location.href = '/tickets/new' } }}
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
            {data.items.map((ticket) => (
              <TicketCard key={ticket['@id']} ticket={ticket} />
            ))}
          </div>
          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <TicketTable tickets={data.items} />
          </div>
          <Pagination
            page={page}
            totalItems={data.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <PassengerManifestModal open={manifestOpen} onOpenChange={setManifestOpen} />
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
