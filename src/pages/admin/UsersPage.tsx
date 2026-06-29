import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  LayoutGrid,
  Lock,
  Mail,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Table2,
  Trash2,
  Unlock,
  User,
  Users,
  X,
} from 'lucide-react'
import { useUsers, useDeleteUser, useToggleUserLock } from '@/hooks/useUsers'
import { useProfiles } from '@/hooks/useProfiles'
import { PERSON_TYPE_LABELS } from '@/constants/profile'
import type { PersonType } from '@/constants/profile'
import { getUserProfileLabel } from '@/types/user'
import type { AdminUser } from '@/types/user'
import {
  countActiveUserFilters,
  emptyUserFilters,
  parseUserFiltersFromSearchParams,
  userFiltersStateToApi,
  userFiltersToSearchParams,
  type UserFiltersState,
} from '@/lib/user-filters'
import { toIri } from '@/lib/hydra'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatDate, cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'

const ITEMS_PER_PAGE = 20

const filterInputClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const lockedFilterOptions = () => [
  { value: '', label: 'Tous' },
  { value: 'false', label: 'Actif' },
  { value: 'true', label: 'Verrouillé' },
]

type UsersViewMode = 'cards' | 'table'

function readUsersViewMode(): UsersViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: UsersViewMode
  onChange: (mode: UsersViewMode) => void
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

function UserFiltersFields({
  draft,
  onChange,
  profileOptions,
  profilesLoading,
}: {
  draft: UserFiltersState
  onChange: (patch: Partial<UserFiltersState>) => void
  profileOptions: { value: string; label: string }[]
  profilesLoading: boolean
}) {
  return (
    <div className="space-y-6">
      <FilterSection title="Identité" icon={User}>
        <Input
          label="Email"
          type="email"
          placeholder="email@exemple.com"
          value={draft.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={filterInputClass}
        />
        <Input
          label="Téléphone"
          placeholder="Ex. +243..."
          value={draft.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          className={filterInputClass}
        />
      </FilterSection>
      <FilterSection title="Accès" icon={Shield}>
        <Select
          label="Statut"
          options={lockedFilterOptions()}
          value={draft.locked}
          onChange={(e) => onChange({ locked: e.target.value as UserFiltersState['locked'] })}
          variant="filter"
        />
        <Select
          label="Profil"
          options={[{ value: '', label: 'Tous les profils' }, ...profileOptions]}
          value={draft.profile}
          onChange={(e) => onChange({ profile: e.target.value })}
          variant="filter"
          disabled={profilesLoading}
          placement="top"
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

function UserCard({
  user,
  onToggleLock,
  onDelete,
  lockPending,
}: {
  user: AdminUser
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  lockPending: boolean
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/admin/users/${user.id}/edit`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold leading-tight truncate">{user.displayName}</p>
                <Badge variant={user.locked ? 'destructive' : 'success'} className="shrink-0">
                  {user.locked ? 'Verrouillé' : 'Actif'}
                </Badge>
              </div>
              <p className="inline-flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {user.email}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-normal">
                  {PERSON_TYPE_LABELS[user.personType as PersonType] ?? user.personType ?? '—'}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {getUserProfileLabel(user)}
                </Badge>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-orange" />
          </div>
        </Link>

        <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/users/${user.id}/edit`}>Modifier</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            aria-label={user.locked ? 'Déverrouiller' : 'Verrouiller'}
            onClick={() => onToggleLock(user.id)}
            disabled={lockPending}
          >
            {user.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl text-destructive hover:text-destructive"
            aria-label="Supprimer"
            onClick={() => onDelete(user.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function UserTable({
  users,
  onToggleLock,
  onDelete,
  lockPending,
}: {
  users: AdminUser[]
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  lockPending: boolean
}) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Nom</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Profil</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell
                className="cursor-pointer font-medium"
                onClick={() => void navigate(`/admin/users/${user.id}/edit`)}
              >
                {user.displayName}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">{user.email}</TableCell>
              <TableCell className="hidden md:table-cell text-sm">{getUserProfileLabel(user)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {PERSON_TYPE_LABELS[user.personType as PersonType] ?? user.personType ?? '—'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.locked ? 'destructive' : 'success'}>
                  {user.locked ? 'Verrouillé' : 'Actif'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/users/${user.id}/edit`}>Modifier</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={user.locked ? 'Déverrouiller' : 'Verrouiller'}
                    onClick={() => onToggleLock(user.id)}
                    disabled={lockPending}
                  >
                    {user.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer"
                    onClick={() => onDelete(user.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
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

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [panelDraft, setPanelDraft] = useState<UserFiltersState>(emptyUserFilters)
  const [viewMode, setViewMode] = useState<UsersViewMode>(readUsersViewMode)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const filters = useMemo(
    () => parseUserFiltersFromSearchParams(searchParams),
    [searchParams],
  )

  const [searchInput, setSearchInput] = useState(filters.displayName)

  useEffect(() => {
    setSearchInput(filters.displayName)
  }, [filters.displayName])

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === filters.displayName) return

    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('displayName', trimmed)
        else next.delete('displayName')
        next.delete('page')
        return next
      }, { replace: true })
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput, filters.displayName, setSearchParams])

  const { data, isLoading, isFetching } = useUsers({
    ...userFiltersStateToApi(filters),
    page,
    itemsPerPage: ITEMS_PER_PAGE,
  })
  const { data: profilesData, isLoading: profilesLoading } = useProfiles({ itemsPerPage: 100 })
  const deleteUser = useDeleteUser()
  const toggleLock = useToggleUserLock()

  const profileOptions = useMemo(
    () =>
      (profilesData?.items ?? []).map((p) => ({
        value: p['@id'] ?? toIri('profiles', p.id),
        label: p.label,
      })),
    [profilesData?.items],
  )

  const profileLabelByIri = useMemo(() => {
    const map = new Map<string, string>()
    for (const opt of profileOptions) map.set(opt.value, opt.label)
    return map
  }, [profileOptions])

  const activeCount = countActiveUserFilters(filters)
  const panelDraftCount = countActiveUserFilters(panelDraft)

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
    setPanelDraft({ ...filters, displayName: searchInput.trim() })
    setFiltersOpen(true)
  }

  const closeFilters = () => setFiltersOpen(false)
  const toggleFilters = () => (filtersOpen ? closeFilters() : openFilters())

  const applyPanelFilters = () => {
    const displayName = searchInput.trim() || panelDraft.displayName.trim()
    const next = { ...panelDraft, displayName }
    setSearchParams(userFiltersToSearchParams(next), { replace: true })
    setSearchInput(displayName)
    setFiltersOpen(false)
  }

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
    setSearchInput('')
    setPanelDraft(emptyUserFilters)
    setFiltersOpen(false)
  }

  const patchFilters = (patch: Partial<UserFiltersState>) => {
    const next = { ...filters, ...patch }
    if ('displayName' in patch) setSearchInput(patch.displayName ?? '')
    setSearchParams(userFiltersToSearchParams(next, page), { replace: true })
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(userFiltersToSearchParams(filters, nextPage), { replace: true })
  }

  const handleDelete = async () => {
    if (!deleteUserId) return
    await deleteUser.mutateAsync(deleteUserId)
    setDeleteUserId(null)
  }

  const handleViewModeChange = (mode: UsersViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.USERS_VIEW, mode)
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
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          </div>
          {data && (
            <p className="pl-11 text-sm text-muted-foreground">
              {data.totalItems} utilisateur{data.totalItems !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 rounded-full px-4 shadow-sm">
          <Link to="/admin/users/new">
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
              placeholder="Rechercher un utilisateur..."
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
              <UserFiltersFields
                draft={panelDraft}
                onChange={(patch) => setPanelDraft((prev) => ({ ...prev, ...patch }))}
                profileOptions={profileOptions}
                profilesLoading={profilesLoading}
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
              <UserFiltersFields
                draft={panelDraft}
                onChange={(patch) => setPanelDraft((prev) => ({ ...prev, ...patch }))}
                profileOptions={profileOptions}
                profilesLoading={profilesLoading}
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
          {filters.displayName && (
            <FilterChip label={filters.displayName} onRemove={() => patchFilters({ displayName: '' })} />
          )}
          {filters.email && (
            <FilterChip label={filters.email} onRemove={() => patchFilters({ email: '' })} />
          )}
          {filters.phone && (
            <FilterChip label={filters.phone} onRemove={() => patchFilters({ phone: '' })} />
          )}
          {filters.locked && (
            <FilterChip
              label={filters.locked === 'true' ? 'Verrouillé' : 'Actif'}
              onRemove={() => patchFilters({ locked: '' })}
            />
          )}
          {filters.profile && (
            <FilterChip
              label={profileLabelByIri.get(filters.profile) ?? 'Profil'}
              onRemove={() => patchFilters({ profile: '' })}
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
          <LoadingSpinner label="Chargement des utilisateurs..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={User}
          title="Aucun utilisateur"
          description={
            activeCount > 0
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez un compte pour permettre l\'accès à l\'application.'
          }
          action={{ label: 'Nouvel utilisateur', onClick: () => { window.location.href = '/admin/users/new' } }}
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
            {data.items.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onToggleLock={(id) => toggleLock.mutate(id)}
                onDelete={setDeleteUserId}
                lockPending={toggleLock.isPending}
              />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <UserTable
              users={data.items}
              onToggleLock={(id) => toggleLock.mutate(id)}
              onDelete={setDeleteUserId}
              lockPending={toggleLock.isPending}
            />
          </div>

          <Pagination
            page={page}
            totalItems={data.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <ConfirmDialog
        open={deleteUserId != null}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        title="Supprimer l'utilisateur"
        description="Cette action est irréversible. Le compte sera définitivement supprimé."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteUser.isPending}
      />
    </div>
  )
}
