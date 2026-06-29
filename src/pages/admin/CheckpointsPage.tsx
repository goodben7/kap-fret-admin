import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  X,
} from 'lucide-react'
import { useCheckpoints } from '@/hooks/useCheckpoints'
import { getProvinceLabel } from '@/lib/province'
import {
  checkpointFiltersStateToApi,
  checkpointFiltersToSearchParams,
  countActiveCheckpointFilters,
  emptyCheckpointFilters,
  parseCheckpointFiltersFromSearchParams,
  type CheckpointFiltersState,
} from '@/lib/checkpoint-filters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ProvinceAsyncSelect } from '@/components/ui/province-async-select'
import { cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { Checkpoint } from '@/types/checkpoint'

const ITEMS_PER_PAGE = 20

const activeFilterOptions = () => [
  { value: '', label: 'Tous' },
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

type CheckpointsViewMode = 'cards' | 'table'

function readCheckpointsViewMode(): CheckpointsViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHECKPOINTS_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: CheckpointsViewMode
  onChange: (mode: CheckpointsViewMode) => void
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

function CheckpointFiltersFields({
  draft,
  onChange,
}: {
  draft: CheckpointFiltersState
  onChange: (patch: Partial<CheckpointFiltersState>) => void
}) {
  return (
    <div className="space-y-6">
      <FilterSection title="Checkpoint" icon={MapPin}>
        <Select
          label="Statut"
          options={activeFilterOptions()}
          value={draft.active}
          onChange={(e) => onChange({ active: e.target.value as CheckpointFiltersState['active'] })}
          variant="filter"
        />
      </FilterSection>
      <FilterSection title="Province" icon={MapPin}>
        <ProvinceAsyncSelect
          label="Province"
          placeholder="Filtrer par province..."
          value={draft.province}
          onChange={(iri) => onChange({ province: iri })}
          initialProvinceIri={draft.province || undefined}
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

function CheckpointCard({ checkpoint }: { checkpoint: Checkpoint }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/admin/checkpoints/${checkpoint.id}`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold leading-tight truncate">{checkpoint.label}</p>
                <Badge variant={checkpoint.active ? 'success' : 'destructive'} className="shrink-0">
                  {checkpoint.active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {getProvinceLabel(checkpoint.province)}
              </p>
              <p className="text-xs text-muted-foreground">
                {checkpoint.latitude}, {checkpoint.longitude}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-orange" />
          </div>
        </Link>

        <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/checkpoints/${checkpoint.id}`}>Voir</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/checkpoints/${checkpoint.id}/edit`}>Modifier</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CheckpointTable({ checkpoints }: { checkpoints: Checkpoint[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Libellé</TableHead>
            <TableHead className="hidden sm:table-cell">Province</TableHead>
            <TableHead className="hidden md:table-cell">Coordonnées</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checkpoints.map((cp) => (
            <TableRow key={cp.id}>
              <TableCell
                className="cursor-pointer font-medium"
                onClick={() => void navigate(`/admin/checkpoints/${cp.id}`)}
              >
                {cp.label}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{getProvinceLabel(cp.province)}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {cp.latitude}, {cp.longitude}
              </TableCell>
              <TableCell>
                <Badge variant={cp.active ? 'success' : 'destructive'}>
                  {cp.active ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/checkpoints/${cp.id}`}>Voir</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/checkpoints/${cp.id}/edit`}>Modifier</Link>
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

export function CheckpointsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<CheckpointFiltersState>(emptyCheckpointFilters)
  const [viewMode, setViewMode] = useState<CheckpointsViewMode>(readCheckpointsViewMode)

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const filters = useMemo(
    () => parseCheckpointFiltersFromSearchParams(searchParams),
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

  const { data, isLoading, isFetching } = useCheckpoints({
    ...checkpointFiltersStateToApi(filters),
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const activeCount = countActiveCheckpointFilters(filters)
  const panelDraftCount = countActiveCheckpointFilters(panelDraft)

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
    setSearchParams(checkpointFiltersToSearchParams(next), { replace: true })
    setSearchInput(label)
    setFiltersOpen(false)
  }

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
    setSearchInput('')
    setPanelDraft(emptyCheckpointFilters)
    setFiltersOpen(false)
  }

  const patchFilters = (patch: Partial<CheckpointFiltersState>) => {
    const next = { ...filters, ...patch }
    if ('label' in patch) setSearchInput(patch.label ?? '')
    setSearchParams(checkpointFiltersToSearchParams(next, page), { replace: true })
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(checkpointFiltersToSearchParams(filters, nextPage), { replace: true })
  }

  const handleViewModeChange = (mode: CheckpointsViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.CHECKPOINTS_VIEW, mode)
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
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Checkpoints</h1>
          </div>
          {data && (
            <p className="pl-11 text-sm text-muted-foreground">
              {data.totalItems} checkpoint{data.totalItems !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 rounded-full px-4 shadow-sm">
          <Link to="/admin/checkpoints/new">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Nouveau</span>
          </Link>
        </Button>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:z-auto">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher un checkpoint..."
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
              <CheckpointFiltersFields
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
              <CheckpointFiltersFields
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
          {filters.active && (
            <FilterChip
              label={filters.active === 'true' ? 'Actif' : 'Inactif'}
              onRemove={() => patchFilters({ active: '' })}
            />
          )}
          {filters.province && (
            <FilterChip label="Province" onRemove={() => patchFilters({ province: '' })} />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des checkpoints..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={MapPin}
          title="Aucun checkpoint"
          description={
            activeCount > 0
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez un checkpoint pour les trajets et bureaux d\'émission.'
          }
          action={{ label: 'Nouveau checkpoint', onClick: () => { window.location.href = '/admin/checkpoints/new' } }}
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
            {data.items.map((cp) => (
              <CheckpointCard key={cp.id} checkpoint={cp} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <CheckpointTable checkpoints={data.items} />
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
