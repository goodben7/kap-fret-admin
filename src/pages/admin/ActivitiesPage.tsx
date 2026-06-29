import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  History,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Table2,
  User,
  X,
} from 'lucide-react'
import { useActivities } from '@/hooks/useActivities'
import { activityFilterOptions, getActivityLabel } from '@/constants/activity'
import {
  activityFiltersStateToApi,
  activityFiltersToSearchParams,
  countActiveActivityFilters,
  emptyActivityFilters,
  parseActivityFiltersFromSearchParams,
  type ActivityFiltersState,
} from '@/lib/activity-filters'
import {
  ACTIVITY_RESOURCE_FILTER_OPTIONS,
  getActivityResourceLabel,
  getActivityResourcePath,
  normalizeActivityResourceName,
} from '@/lib/activity-display'
import { getUserRefLabel } from '@/lib/user-ref'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime, cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { Activity } from '@/types/activity'

const ITEMS_PER_PAGE = 20

const filterInputClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

type ActivitiesViewMode = 'cards' | 'table'

function readActivitiesViewMode(): ActivitiesViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVITIES_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function resourceBadgeVariant(ressourceName: string): 'default' | 'secondary' | 'outline' {
  const key = normalizeActivityResourceName(ressourceName)
  if (key === 'ticket' || key === 'check_in') return 'default'
  if (key === 'freight_shipment') return 'secondary'
  return 'outline'
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ActivitiesViewMode
  onChange: (mode: ActivitiesViewMode) => void
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

function ActivityFiltersFields({
  draft,
  onChange,
}: {
  draft: ActivityFiltersState
  onChange: (patch: Partial<ActivityFiltersState>) => void
}) {
  return (
    <div className="space-y-6">
      <FilterSection title="Action" icon={History}>
        <Select
          label="Type d'action"
          options={activityFilterOptions()}
          value={draft.activity}
          onChange={(e) => onChange({ activity: e.target.value })}
          variant="filter"
        />
        <Select
          label="Ressource"
          options={[...ACTIVITY_RESOURCE_FILTER_OPTIONS]}
          value={draft.ressourceName}
          onChange={(e) => onChange({ ressourceName: e.target.value })}
          variant="filter"
        />
      </FilterSection>
      <FilterSection title="Utilisateurs" icon={User}>
        <Input
          label="Utilisateur concerné (ID)"
          placeholder="Ex. USVXTA0605120415"
          value={draft.user}
          onChange={(e) => onChange({ user: e.target.value })}
          className={filterInputClass}
        />
        <Input
          label="Déclenché par (ID)"
          placeholder="Ex. USVXTA0605120415"
          value={draft.triggeredBy}
          onChange={(e) => onChange({ triggeredBy: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>
      <FilterSection title="Date" icon={Calendar}>
        <Input
          label="Date de l'action"
          type="date"
          value={draft.date}
          onChange={(e) => onChange({ date: e.target.value })}
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

function ActivityCard({ activity }: { activity: Activity }) {
  const resourcePath = getActivityResourcePath(activity.ressourceName, activity.ressourceIdentifier)
  const actor = getUserRefLabel(activity.triggeredBy)

  return (
    <Card className="overflow-hidden rounded-2xl border-blue-200/90 bg-blue-50/50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800">
              Log Activity
            </span>
            <p className="font-semibold leading-snug">{getActivityLabel(activity.activity)}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(activity.date)}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={resourceBadgeVariant(activity.ressourceName)}>
                {getActivityResourceLabel(activity.ressourceName)}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                #{activity.id}
              </Badge>
            </div>
            <dl className="space-y-1.5 text-sm">
              {actor && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Déclenché par</dt>
                  <dd className="font-medium text-right truncate">{actor}</dd>
                </div>
              )}
              {activity.user && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Utilisateur</dt>
                  <dd className="font-mono text-xs text-right truncate">{activity.user}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground shrink-0">Ressource</dt>
                <dd className="font-mono text-xs text-right truncate">{activity.ressourceIdentifier}</dd>
              </div>
            </dl>
          </div>
          {resourcePath && (
            <Link
              to={resourcePath}
              className="shrink-0 text-muted-foreground/50 transition-colors hover:text-brand-orange"
              aria-label="Voir la ressource"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          )}
        </div>
        {resourcePath && (
          <Button variant="outline" size="sm" asChild className="mt-4 h-10 w-full rounded-xl">
            <Link to={resourcePath}>Voir la ressource</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityTable({ activities }: { activities: Activity[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Action</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="hidden md:table-cell">Ressource</TableHead>
            <TableHead className="hidden lg:table-cell">Déclenché par</TableHead>
            <TableHead className="text-right">Détails</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => {
            const resourcePath = getActivityResourcePath(activity.ressourceName, activity.ressourceIdentifier)
            const actor = getUserRefLabel(activity.triggeredBy)

            return (
              <TableRow key={activity.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{getActivityLabel(activity.activity)}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{formatDateTime(activity.date)}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                  {formatDateTime(activity.date)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="space-y-1">
                    <Badge variant={resourceBadgeVariant(activity.ressourceName)} className="font-normal">
                      {getActivityResourceLabel(activity.ressourceName)}
                    </Badge>
                    <p className="font-mono text-xs text-muted-foreground truncate max-w-[12rem]">
                      {activity.ressourceIdentifier}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{actor ?? '—'}</TableCell>
                <TableCell className="text-right">
                  {resourcePath ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={resourcePath}>Voir</Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function ActivitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<ActivityFiltersState>(emptyActivityFilters)
  const [viewMode, setViewMode] = useState<ActivitiesViewMode>(readActivitiesViewMode)

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const filters = useMemo(
    () => parseActivityFiltersFromSearchParams(searchParams),
    [searchParams],
  )

  const [searchInput, setSearchInput] = useState(filters.ressourceIdentifier)

  useEffect(() => {
    setSearchInput(filters.ressourceIdentifier)
  }, [filters.ressourceIdentifier])

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === filters.ressourceIdentifier) return

    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('ressourceIdentifier', trimmed)
        else next.delete('ressourceIdentifier')
        next.delete('page')
        return next
      }, { replace: true })
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput, filters.ressourceIdentifier, setSearchParams])

  const { data, isLoading, isFetching } = useActivities({
    ...activityFiltersStateToApi(filters),
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const activeCount = countActiveActivityFilters(filters)
  const panelDraftCount = countActiveActivityFilters(panelDraft)

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
    setPanelDraft({ ...filters, ressourceIdentifier: searchInput.trim() })
    setFiltersOpen(true)
  }

  const closeFilters = () => setFiltersOpen(false)
  const toggleFilters = () => (filtersOpen ? closeFilters() : openFilters())

  const applyPanelFilters = () => {
    const ressourceIdentifier = searchInput.trim() || panelDraft.ressourceIdentifier.trim()
    const next = { ...panelDraft, ressourceIdentifier }
    setSearchParams(activityFiltersToSearchParams(next), { replace: true })
    setSearchInput(ressourceIdentifier)
    setFiltersOpen(false)
  }

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
    setSearchInput('')
    setPanelDraft(emptyActivityFilters)
    setFiltersOpen(false)
  }

  const patchFilters = (patch: Partial<ActivityFiltersState>) => {
    const next = { ...filters, ...patch }
    if ('ressourceIdentifier' in patch) setSearchInput(patch.ressourceIdentifier ?? '')
    setSearchParams(activityFiltersToSearchParams(next, page), { replace: true })
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(activityFiltersToSearchParams(filters, nextPage), { replace: true })
  }

  const handleViewModeChange = (mode: ActivitiesViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES_VIEW, mode)
    } catch {
      // ignore
    }
  }

  const activityLabel = (code: string) =>
    activityFilterOptions().find((o) => o.value === code)?.label ?? code

  const resourceLabel = (name: string) =>
    ACTIVITY_RESOURCE_FILTER_OPTIONS.find((o) => o.value === name)?.label ?? name

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-6 lg:max-w-5xl">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Administration
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <History className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Journal d'activité</h1>
        </div>
        {data && (
          <p className="pl-11 text-sm text-muted-foreground">
            {data.totalItems} événement{data.totalItems !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:z-auto">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="ID ressource..."
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
              <ActivityFiltersFields
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
              <ActivityFiltersFields
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
          {filters.ressourceIdentifier && (
            <FilterChip
              label={`ID ${filters.ressourceIdentifier}`}
              onRemove={() => patchFilters({ ressourceIdentifier: '' })}
            />
          )}
          {filters.activity && (
            <FilterChip
              label={activityLabel(filters.activity)}
              onRemove={() => patchFilters({ activity: '' })}
            />
          )}
          {filters.ressourceName && (
            <FilterChip
              label={resourceLabel(filters.ressourceName)}
              onRemove={() => patchFilters({ ressourceName: '' })}
            />
          )}
          {filters.user && (
            <FilterChip label={`User ${filters.user}`} onRemove={() => patchFilters({ user: '' })} />
          )}
          {filters.triggeredBy && (
            <FilterChip
              label={`Par ${filters.triggeredBy}`}
              onRemove={() => patchFilters({ triggeredBy: '' })}
            />
          )}
          {filters.date && (
            <FilterChip label={filters.date} onRemove={() => patchFilters({ date: '' })} />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des activités..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={History}
          title="Aucune activité"
          description={
            activeCount > 0
              ? 'Aucun résultat pour ces filtres.'
              : 'Aucun événement enregistré pour le moment.'
          }
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
            {data.items.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <ActivityTable activities={data.items} />
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
