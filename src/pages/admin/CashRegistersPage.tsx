import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  Wallet,
  X,
} from 'lucide-react'
import { useCashRegisters } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import {
  cashRegisterFiltersStateToApi,
  cashRegisterFiltersToSearchParams,
  countActiveCashRegisterFilters,
  emptyCashRegisterFilters,
  parseCashRegisterFiltersFromSearchParams,
  type CashRegisterFiltersState,
} from '@/lib/cash-register-filters'
import { getCashRegisterCurrencyCode } from '@/lib/cash-register'
import { extractIri } from '@/lib/hydra'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney, cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { CashRegisterResource } from '@/types/cash-register'

const ITEMS_PER_PAGE = 20

const filterInputClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const activeFilterOptions = () => [
  { value: '', label: 'Tous' },
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

type CashRegistersViewMode = 'cards' | 'table'

function readCashRegistersViewMode(): CashRegistersViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CASH_REGISTERS_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({ value, onChange }: { value: CashRegistersViewMode; onChange: (m: CashRegistersViewMode) => void }) {
  return (
    <div className="hidden lg:flex items-center rounded-xl border border-border/80 bg-muted/40 p-1" role="group" aria-label="Mode d'affichage">
      <Button type="button" variant={value === 'cards' ? 'default' : 'ghost'} size="icon" className={cn('h-9 w-9 rounded-lg', value === 'cards' && 'shadow-sm')} onClick={() => onChange('cards')} aria-label="Cartes" aria-pressed={value === 'cards'}>
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button type="button" variant={value === 'table' ? 'default' : 'ghost'} size="icon" className={cn('h-9 w-9 rounded-lg', value === 'table' && 'shadow-sm')} onClick={() => onChange('table')} aria-label="Tableau" aria-pressed={value === 'table'}>
        <Table2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function FilterSection({ title, icon: Icon, children }: { title: string; icon: typeof Search; children: ReactNode }) {
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

function CashRegisterFiltersFields({
  draft,
  onChange,
  currencyOptions,
}: {
  draft: CashRegisterFiltersState
  onChange: (patch: Partial<CashRegisterFiltersState>) => void
  currencyOptions: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-6">
      <FilterSection title="Caisse" icon={Wallet}>
        <Input label="Code" placeholder="Ex. CASH-001" value={draft.code} onChange={(e) => onChange({ code: e.target.value })} className={filterInputClass} />
        <Input label="Nom" placeholder="Recherche partielle..." value={draft.name} onChange={(e) => onChange({ name: e.target.value })} className={filterInputClass} />
        <Select label="Statut" options={activeFilterOptions()} value={draft.active} onChange={(e) => onChange({ active: e.target.value as CashRegisterFiltersState['active'] })} variant="filter" />
        <Select label="Devise" options={[{ value: '', label: 'Toutes' }, ...currencyOptions]} value={draft.currency} onChange={(e) => onChange({ currency: e.target.value })} variant="filter" />
      </FilterSection>
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
      {label}
      <X className="h-3 w-3" />
    </button>
  )
}

function CashRegisterCard({ register }: { register: CashRegisterResource }) {
  const currencyCode = getCashRegisterCurrencyCode(register.currency) ?? 'USD'
  const balance = formatMoney(parseFloat(register.currentBalance) || 0, currencyCode)

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/admin/cash-registers/${register.id}`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold truncate">{register.name}</p>
                <Badge variant={register.active ? 'success' : 'destructive'}>{register.active ? 'Actif' : 'Inactif'}</Badge>
              </div>
              <p className="font-mono text-xs font-semibold text-primary">{register.code}</p>
              {currencyCode && <Badge variant="secondary" className="font-mono font-normal">{currencyCode}</Badge>}
              <p className="text-sm font-bold tabular-nums text-brand-orange">{balance}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 group-hover:text-brand-orange" />
          </div>
        </Link>
        <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl"><Link to={`/admin/cash-registers/${register.id}`}>Voir</Link></Button>
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl"><Link to={`/admin/cash-registers/${register.id}/edit`}>Modifier</Link></Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CashRegisterTable({ registers }: { registers: CashRegisterResource[] }) {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Devise</TableHead>
            <TableHead className="text-right">Solde actuel</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registers.map((register) => {
            const currencyCode = getCashRegisterCurrencyCode(register.currency) ?? 'USD'
            return (
              <TableRow key={register.id}>
                <TableCell className="cursor-pointer font-mono text-xs" onClick={() => void navigate(`/admin/cash-registers/${register.id}`)}>{register.code}</TableCell>
                <TableCell className="cursor-pointer font-medium" onClick={() => void navigate(`/admin/cash-registers/${register.id}`)}>{register.name}</TableCell>
                <TableCell className="font-mono text-xs">{currencyCode ?? '—'}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatMoney(parseFloat(register.currentBalance) || 0, currencyCode)}</TableCell>
                <TableCell><Badge variant={register.active ? 'success' : 'destructive'}>{register.active ? 'Actif' : 'Inactif'}</Badge></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild><Link to={`/admin/cash-registers/${register.id}`}>Voir</Link></Button>
                    <Button variant="ghost" size="sm" asChild><Link to={`/admin/cash-registers/${register.id}/edit`}>Modifier</Link></Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function CashRegistersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<CashRegisterFiltersState>(emptyCashRegisterFilters)
  const [viewMode, setViewMode] = useState<CashRegistersViewMode>(readCashRegistersViewMode)
  const { data: currencies = [] } = useCurrenciesForSelect()

  const currencyOptions = useMemo(
    () =>
      currencies
        .filter((c) => c.active && !c.deleted)
        .map((c) => ({ value: extractIri(c) ?? c['@id'], label: `${c.code} — ${c.label}` })),
    [currencies],
  )

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const filters = useMemo(() => parseCashRegisterFiltersFromSearchParams(searchParams), [searchParams])
  const [searchInput, setSearchInput] = useState(filters.name)

  useEffect(() => { setSearchInput(filters.name) }, [filters.name])

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === filters.name) return
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('name', trimmed)
        else next.delete('name')
        next.delete('page')
        return next
      }, { replace: true })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, filters.name, setSearchParams])

  const { data, isLoading, isFetching } = useCashRegisters({
    ...cashRegisterFiltersStateToApi(filters),
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  const activeCount = countActiveCashRegisterFilters(filters)
  const panelDraftCount = countActiveCashRegisterFilters(panelDraft)

  const openFilters = () => { setPanelDraft({ ...filters, name: searchInput.trim() }); setFiltersOpen(true) }
  const closeFilters = () => setFiltersOpen(false)
  const applyPanelFilters = () => {
    const name = searchInput.trim() || panelDraft.name.trim()
    setSearchParams(cashRegisterFiltersToSearchParams({ ...panelDraft, name }), { replace: true })
    setSearchInput(name)
    setFiltersOpen(false)
  }
  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
    setSearchInput('')
    setPanelDraft(emptyCashRegisterFilters)
    setFiltersOpen(false)
  }
  const patchFilters = (patch: Partial<CashRegisterFiltersState>) => {
    const next = { ...filters, ...patch }
    if ('name' in patch) setSearchInput(patch.name ?? '')
    setSearchParams(cashRegisterFiltersToSearchParams(next, page), { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-6 lg:max-w-5xl">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Administration
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Wallet className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Caisses</h1>
          </div>
          {data && <p className="pl-11 text-sm text-muted-foreground">{data.totalItems} caisse{data.totalItems !== 1 ? 's' : ''}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={(m) => { setViewMode(m); try { localStorage.setItem(STORAGE_KEYS.CASH_REGISTERS_VIEW, m) } catch { /* ignore */ } }} />
          <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
            <Link to="/admin/cash-registers/new"><Plus className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Nouvelle</span></Link>
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur lg:static lg:mx-0 lg:px-0 lg:bg-transparent">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input placeholder="Rechercher par nom..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9 h-11 rounded-xl bg-muted/40 border-transparent" />
          </div>
          <Button type="button" variant={filtersOpen ? 'default' : 'outline'} size="icon" className="h-11 w-11 rounded-xl relative" onClick={() => (filtersOpen ? closeFilters() : openFilters())} aria-label="Filtres">
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">{activeCount}</span>}
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <Card className="rounded-2xl border-border/60 bg-muted/20 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <CashRegisterFiltersFields draft={panelDraft} onChange={(p) => setPanelDraft((prev) => ({ ...prev, ...p }))} currencyOptions={currencyOptions} />
            <div className="flex gap-2 border-t pt-4">
              <Button type="button" onClick={applyPanelFilters} className="flex-1 h-11 rounded-xl font-semibold">Appliquer</Button>
              {panelDraftCount > 0 && <Button type="button" variant="outline" onClick={resetAllFilters} className="h-11 rounded-xl px-4"><X className="h-4 w-4" /></Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.code && <FilterChip label={`Code ${filters.code}`} onRemove={() => patchFilters({ code: '' })} />}
          {filters.name && <FilterChip label={filters.name} onRemove={() => patchFilters({ name: '' })} />}
          {filters.active && <FilterChip label={filters.active === 'true' ? 'Actif' : 'Inactif'} onRemove={() => patchFilters({ active: '' })} />}
          {filters.currency && <FilterChip label="Devise" onRemove={() => patchFilters({ currency: '' })} />}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner label="Chargement des caisses..." /></div>
      ) : !data?.items.length ? (
        <EmptyState icon={Wallet} title="Aucune caisse" description={activeCount > 0 ? 'Aucun résultat pour ces filtres.' : 'Créez une caisse pour gérer les encaissements.'} action={{ label: 'Nouvelle caisse', onClick: () => { window.location.href = '/admin/cash-registers/new' } }} />
      ) : (
        <>
          <div className={cn('space-y-3', viewMode === 'table' && 'lg:hidden', isFetching && 'opacity-60 pointer-events-none')}>
            {data.items.map((register) => <CashRegisterCard key={register.id} register={register} />)}
          </div>
          <div className={cn('hidden', viewMode === 'table' && 'lg:block', isFetching && 'opacity-60 pointer-events-none')}>
            <CashRegisterTable registers={data.items} />
          </div>
          <Pagination page={page} totalItems={data.totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={(p) => setSearchParams(cashRegisterFiltersToSearchParams(filters, p), { replace: true })} />
        </>
      )}
    </div>
  )
}
