import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  LayoutGrid,
  Plus,
  Receipt,
  SlidersHorizontal,
  Table2,
  X,
} from 'lucide-react'
import { useCashTransactions } from '@/hooks/useCashTransactions'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useAuth } from '@/hooks/useAuth'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import {
  cashTransactionFiltersStateToApi,
  cashTransactionFiltersToSearchParams,
  countActiveCashTransactionFilters,
  emptyCashTransactionFilters,
  parseCashTransactionFiltersFromSearchParams,
  type CashTransactionFiltersState,
} from '@/lib/cash-transaction-filters'
import {
  getCashTransactionCurrencyCode,
  getCashTransactionReferenceTypeLabel,
  getCashTransactionTypeLabel,
} from '@/lib/cash-transaction'
import {
  CASH_TRANSACTION_REFERENCE_TYPE_LABELS,
  CASH_TRANSACTION_REFERENCE_TYPE_OPTIONS,
  CASH_TRANSACTION_TYPE,
  CASH_TRANSACTION_TYPE_LABELS,
  CASH_TRANSACTION_TYPE_OPTIONS,
} from '@/constants/cash-transaction'
import type { CashTransaction } from '@/types/cash-transaction'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { extractIri } from '@/lib/hydra'
import { formatDate, formatDateTime, formatMoney, cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 20

const filterInputClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

type ViewMode = 'cards' | 'table'

const validatedFilterOptions = () => [
  { value: '', label: 'Tous' },
  { value: 'true', label: 'Validée' },
  { value: 'false', label: 'En attente' },
]

function FilterSection({ title, icon: Icon, children }: { title: string; icon: typeof Receipt; children: ReactNode }) {
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

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  )
}

function TypeBadge({ type }: { type: CashTransaction['type'] }) {
  const isEntry = type === CASH_TRANSACTION_TYPE.ENTRY
  return (
    <Badge variant={isEntry ? 'success' : 'destructive'} className="gap-1">
      {isEntry ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
      {getCashTransactionTypeLabel(type)}
    </Badge>
  )
}

function TransactionCard({ transaction }: { transaction: CashTransaction }) {
  const currencyCode = getCashTransactionCurrencyCode(transaction.currency) ?? 'USD'
  const amount = parseFloat(transaction.amount) || 0

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/cash-transactions/${transaction.id}`} className="group block space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={transaction.type} />
                <Badge variant={transaction.validated ? 'secondary' : 'outline'}>
                  {transaction.validated ? 'Validée' : 'En attente'}
                </Badge>
              </div>
              <p className="text-sm font-medium leading-snug line-clamp-2">{transaction.description}</p>
              <p className="text-xs text-muted-foreground">
                {getCashTransactionReferenceTypeLabel(transaction.referenceType)}
                {transaction.referenceId ? ` · ${transaction.referenceId}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-bold tabular-nums text-brand-orange">{formatMoney(amount, currencyCode)}</p>
              <ChevronRight className="ml-auto mt-2 h-5 w-5 text-muted-foreground/50 group-hover:text-brand-orange" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{formatDateTime(transaction.transactionDate)}</p>
        </Link>
      </CardContent>
    </Card>
  )
}

function CashTransactionFiltersFields({
  draft,
  onChange,
  cashRegisterOptions,
}: {
  draft: CashTransactionFiltersState
  onChange: (patch: Partial<CashTransactionFiltersState>) => void
  cashRegisterOptions: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-6">
      <FilterSection title="Transaction" icon={Receipt}>
        <Input
          label="ID"
          placeholder="Ex. CTAZOA0622110118"
          value={draft.id}
          onChange={(e) => onChange({ id: e.target.value })}
          className={filterInputClass}
        />
        <Select
          label="Type"
          options={[{ value: '', label: 'Tous' }, ...CASH_TRANSACTION_TYPE_OPTIONS]}
          value={draft.type}
          onChange={(e) => onChange({ type: e.target.value as CashTransactionFiltersState['type'] })}
          variant="filter"
        />
        <Select
          label="Statut validation"
          options={validatedFilterOptions()}
          value={draft.validated}
          onChange={(e) => onChange({ validated: e.target.value as CashTransactionFiltersState['validated'] })}
          variant="filter"
        />
        <Select
          label="Caisse"
          options={[{ value: '', label: 'Toutes' }, ...cashRegisterOptions]}
          value={draft.cashRegister}
          onChange={(e) => onChange({ cashRegister: e.target.value })}
          variant="filter"
        />
      </FilterSection>
      <FilterSection title="Référence" icon={Receipt}>
        <Select
          label="Type de référence"
          options={[{ value: '', label: 'Tous' }, ...CASH_TRANSACTION_REFERENCE_TYPE_OPTIONS]}
          value={draft.referenceType}
          onChange={(e) => onChange({ referenceType: e.target.value as CashTransactionFiltersState['referenceType'] })}
          variant="filter"
        />
        <Input
          label="ID référence"
          placeholder="Ex. TKNKPI0622110118"
          value={draft.referenceId}
          onChange={(e) => onChange({ referenceId: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>
      <FilterSection title="Dates" icon={Receipt}>
        <Input
          label="Date de transaction"
          type="date"
          value={draft.transactionDate}
          onChange={(e) => onChange({ transactionDate: e.target.value })}
          className={filterInputClass}
        />
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

export function CashTransactionsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [] } = useCashRegistersForSelect(issuingOfficeIri)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<CashTransactionFiltersState>(emptyCashTransactionFilters)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((register) => ({
        value: extractIri(register) ?? register['@id'],
        label: `${register.code} — ${register.name}`,
      })),
    [cashRegisters],
  )

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const filters = useMemo(() => parseCashTransactionFiltersFromSearchParams(searchParams), [searchParams])
  const activeCount = countActiveCashTransactionFilters(filters)

  const apiFilters = useMemo(
    () => ({
      ...cashTransactionFiltersStateToApi(filters),
      ...(issuingOfficeIri ? { issuingOffice: issuingOfficeIri } : {}),
      page,
      itemsPerPage: ITEMS_PER_PAGE,
    }),
    [filters, issuingOfficeIri, page],
  )

  const { data, isLoading, isFetching } = useCashTransactions(apiFilters)

  const openFilters = () => {
    setPanelDraft({ ...filters })
    setFiltersOpen(true)
  }
  const closeFilters = () => setFiltersOpen(false)
  const applyPanelFilters = () => {
    setSearchParams(cashTransactionFiltersToSearchParams(panelDraft), { replace: true })
    setFiltersOpen(false)
  }
  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
    setPanelDraft(emptyCashTransactionFilters)
    setFiltersOpen(false)
  }
  const patchFilters = (patch: Partial<CashTransactionFiltersState>) => {
    const next = { ...filters, ...patch }
    setSearchParams(cashTransactionFiltersToSearchParams(next, page), { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-6 lg:max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Receipt className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Transactions caisse</h1>
          </div>
          {data && (
            <p className="pl-11 text-sm text-muted-foreground">
              {data.totalItems} transaction{data.totalItems !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden lg:flex items-center rounded-xl border border-border/80 bg-muted/40 p-1">
            <Button
              type="button"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="icon"
              className={cn('h-9 w-9 rounded-lg', viewMode === 'cards' && 'shadow-sm')}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              className={cn('h-9 w-9 rounded-lg', viewMode === 'table' && 'shadow-sm')}
              onClick={() => setViewMode('table')}
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
            <Link to="/cash-transactions/new">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nouvelle</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur lg:static lg:mx-0 lg:px-0 lg:bg-transparent">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={filtersOpen ? 'default' : 'outline'}
            className="h-11 flex-1 rounded-xl relative sm:flex-none sm:px-6"
            onClick={() => (filtersOpen ? closeFilters() : openFilters())}
          >
            <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
            <span>Filtres</span>
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background sm:static sm:ml-2 sm:h-5 sm:w-5 sm:text-xs sm:ring-0">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <Card className="rounded-2xl border-border/60 bg-muted/20 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <CashTransactionFiltersFields
              draft={panelDraft}
              onChange={(p) => setPanelDraft((prev) => ({ ...prev, ...p }))}
              cashRegisterOptions={cashRegisterOptions}
            />
            <div className="flex gap-2 border-t pt-4">
              <Button type="button" onClick={applyPanelFilters} className="flex-1 h-11 rounded-xl font-semibold">
                Appliquer
              </Button>
              {countActiveCashTransactionFilters(panelDraft) > 0 && (
                <Button type="button" variant="outline" onClick={resetAllFilters} className="h-11 rounded-xl px-4">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.id && <FilterChip label={`ID ${filters.id}`} onRemove={() => patchFilters({ id: '' })} />}
          {filters.type && (
            <FilterChip
              label={CASH_TRANSACTION_TYPE_LABELS[filters.type]}
              onRemove={() => patchFilters({ type: '' })}
            />
          )}
          {filters.validated && (
            <FilterChip
              label={filters.validated === 'true' ? 'Validée' : 'En attente'}
              onRemove={() => patchFilters({ validated: '' })}
            />
          )}
          {filters.cashRegister && (
            <FilterChip label="Caisse" onRemove={() => patchFilters({ cashRegister: '' })} />
          )}
          {filters.referenceType && (
            <FilterChip
              label={CASH_TRANSACTION_REFERENCE_TYPE_LABELS[filters.referenceType] ?? filters.referenceType}
              onRemove={() => patchFilters({ referenceType: '' })}
            />
          )}
          {filters.referenceId && (
            <FilterChip label={filters.referenceId} onRemove={() => patchFilters({ referenceId: '' })} />
          )}
          {filters.transactionDate && (
            <FilterChip
              label={`Transaction ${formatDate(filters.transactionDate)}`}
              onRemove={() => patchFilters({ transactionDate: '' })}
            />
          )}
          {filters.createdAt && (
            <FilterChip
              label={`Créée ${formatDate(filters.createdAt)}`}
              onRemove={() => patchFilters({ createdAt: '' })} />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des transactions..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Receipt}
          title="Aucune transaction"
          description={
            activeCount > 0
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez une transaction manuelle pour enregistrer un mouvement de caisse.'
          }
          action={
            activeCount === 0
              ? { label: 'Nouvelle transaction', onClick: () => void navigate('/cash-transactions/new') }
              : undefined
          }
        />
      ) : (
        <>
          <div className={cn('space-y-3', viewMode === 'table' && 'lg:hidden', isFetching && 'opacity-60')}>
            {data.items.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
          <div
            className={cn(
              'hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60',
            )}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((tx) => {
                  const currencyCode = getCashTransactionCurrencyCode(tx.currency) ?? 'USD'
                  return (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer"
                      onClick={() => void navigate(`/cash-transactions/${tx.id}`)}
                    >
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(tx.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate font-medium">{tx.description}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoney(parseFloat(tx.amount) || 0, currencyCode)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.validated ? 'secondary' : 'outline'}>
                          {tx.validated ? 'Validée' : 'En attente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalItems={data.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(p) => setSearchParams(cashTransactionFiltersToSearchParams(filters, p), { replace: true })}
          />
        </>
      )}
    </div>
  )
}
