import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  LayoutGrid,
  Map,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  X,
} from 'lucide-react'
import { useProvinces } from '@/hooks/useProvinces'
import {
  countActiveProvinceFilters,
  emptyProvinceFilters,
  parseProvinceFiltersFromSearchParams,
  provinceFiltersStateToApi,
  provinceFiltersToSearchParams,
  type ProvinceFiltersState,
} from '@/lib/province-filters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { Province } from '@/types/province'

const ITEMS_PER_PAGE = 20

const filterInputClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const activeFilterOptions = () => [
  { value: '', label: 'Tous' },
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

type ProvincesViewMode = 'cards' | 'table'

function readProvincesViewMode(): ProvincesViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROVINCES_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ProvincesViewMode
  onChange: (mode: ProvincesViewMode) => void
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

function ProvinceFiltersFields({
  draft,
  onChange,
}: {
  draft: ProvinceFiltersState
  onChange: (patch: Partial<ProvinceFiltersState>) => void
}) {
  return (
    <div className="space-y-6">
      <FilterSection title="Province" icon={Map}>
        <Input
          label="Code"
          placeholder="Ex. KIN"
          value={draft.code}
          onChange={(e) => onChange({ code: e.target.value })}
          className={filterInputClass}
        />
        <Select
          label="Statut"
          options={activeFilterOptions()}
          value={draft.active}
          onChange={(e) => onChange({ active: e.target.value as ProvinceFiltersState['active'] })}
          variant="filter"
        />
      </FilterSection>
      <FilterSection title="Date" icon={Calendar}>
        <Input
          label="Date de création"
          type="date"
          value={draft.createdAt}
          onChange={(e) => onChange({ createdAt: e.target.value })}
          className={filterInputClass}
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

function ProvinceCard({ province }: { province: Province }) {
  const checkpointCount = province.checkpoints?.length ?? 0

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/admin/provinces/${province.id}`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold leading-tight truncate">{province.label}</p>
                <Badge variant={province.active ? 'success' : 'destructive'} className="shrink-0">
                  {province.active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="font-mono text-xs font-semibold text-primary">{province.code}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{checkpointCount} checkpoint{checkpointCount !== 1 ? 's' : ''}</span>
                {province.createdAt && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(province.createdAt)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-orange" />
          </div>
        </Link>

        <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/provinces/${province.id}`}>Voir</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/provinces/${province.id}/edit`}>Modifier</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProvinceTable({ provinces }: { provinces: Province[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Libellé</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="hidden md:table-cell">Créé le</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {provinces.map((province) => (
            <TableRow key={province.id}>
              <TableCell
                className="cursor-pointer font-medium"
                onClick={() => void navigate(`/admin/provinces/${province.id}`)}
              >
                {province.label}
              </TableCell>
              <TableCell className="font-mono text-xs">{province.code}</TableCell>
              <TableCell>
                <Badge variant={province.active ? 'success' : 'destructive'}>
                  {province.active ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                {province.createdAt ? formatDate(province.createdAt) : '—'}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/provinces/${province.id}`}>Voir</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/provinces/${province.id}/edit`}>Modifier</Link>
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

export function ProvincesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<ProvinceFiltersState>(emptyProvinceFilters)
  const [viewMode, setViewMode] = useState<ProvincesViewMode>(readProvincesViewMode)

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const filters = useMemo(
    () => parseProvinceFiltersFromSearchParams(searchParams),
    [searchParams],
  )

  const [searchInput, setSearchInput] = useState(filters.label)

  useEffect(() => {
    setSearchInput(filters.label)
  }, [filters.label])

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === filters.label) return

    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('label', trimmed)
        else next.delete('label')
        next.delete('page')
        return next
      }, { replace: true })
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput, filters.label, setSearchParams])

  const { data, isLoading, isFetching } = useProvinces({
    ...provinceFiltersStateToApi(filters),
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const activeCount = countActiveProvinceFilters(filters)
  const panelDraftCount = countActiveProvinceFilters(panelDraft)

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
    setPanelDraft({ ...filters, label: searchInput.trim() })
    setFiltersOpen(true)
  }

  const closeFilters = () => setFiltersOpen(false)
  const toggleFilters = () => (filtersOpen ? closeFilters() : openFilters())

  const applyPanelFilters = () => {
    const label = searchInput.trim() || panelDraft.label.trim()
    const next = { ...panelDraft, label }
    setSearchParams(provinceFiltersToSearchParams(next), { replace: true })
    setSearchInput(label)
    setFiltersOpen(false)
  }

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
    setSearchInput('')
    setPanelDraft(emptyProvinceFilters)
    setFiltersOpen(false)
  }

  const patchFilters = (patch: Partial<ProvinceFiltersState>) => {
    const next = { ...filters, ...patch }
    if ('label' in patch) setSearchInput(patch.label ?? '')
    setSearchParams(provinceFiltersToSearchParams(next, page), { replace: true })
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(provinceFiltersToSearchParams(filters, nextPage), { replace: true })
  }

  const handleViewModeChange = (mode: ProvincesViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.PROVINCES_VIEW, mode)
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
              <Map className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Provinces</h1>
          </div>
          {data && (
            <p className="pl-11 text-sm text-muted-foreground">
              {data.totalItems} province{data.totalItems !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 rounded-full px-4 shadow-sm">
          <Link to="/admin/provinces/new">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Nouvelle</span>
          </Link>
        </Button>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:z-auto">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher une province..."
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
              <ProvinceFiltersFields
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
              <ProvinceFiltersFields
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
          {filters.label && (
            <FilterChip label={filters.label} onRemove={() => patchFilters({ label: '' })} />
          )}
          {filters.code && (
            <FilterChip label={`Code ${filters.code}`} onRemove={() => patchFilters({ code: '' })} />
          )}
          {filters.active && (
            <FilterChip
              label={filters.active === 'true' ? 'Actif' : 'Inactif'}
              onRemove={() => patchFilters({ active: '' })}
            />
          )}
          {filters.createdAt && (
            <FilterChip
              label={formatDate(filters.createdAt)}
              onRemove={() => patchFilters({ createdAt: '' })}
            />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des provinces..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Map}
          title="Aucune province"
          description={
            activeCount > 0
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez une province pour organiser les checkpoints.'
          }
          action={{ label: 'Nouvelle province', onClick: () => { window.location.href = '/admin/provinces/new' } }}
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
            {data.items.map((province) => (
              <ProvinceCard key={province.id} province={province} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <ProvinceTable provinces={data.items} />
          </div>

          <Pagination
            page={page}
            totalItems={data.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  )
}
