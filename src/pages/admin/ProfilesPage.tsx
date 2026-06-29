import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  KeyRound,
  LayoutGrid,
  Plus,
  Shield,
  Table2,
} from 'lucide-react'
import { useProfiles } from '@/hooks/useProfiles'
import { PERSON_TYPE_LABELS } from '@/constants/profile'
import type { PersonType } from '@/constants/profile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { Profile } from '@/types/profile'

const ITEMS_PER_PAGE = 20

type ProfileViewMode = 'cards' | 'table'

function readProfilesViewMode(): ProfileViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILES_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ProfileViewMode
  onChange: (mode: ProfileViewMode) => void
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

function ProfileCard({ profile }: { profile: Profile }) {
  const permissionCount = profile.permission?.length ?? 0

  return (
    <Link to={`/admin/profiles/${profile.id}/edit`} className="block group">
      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm transition-all active:scale-[0.99] group-hover:border-brand-orange/40 group-hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold leading-tight truncate">{profile.label}</p>
                <Badge variant={profile.active ? 'success' : 'destructive'} className="shrink-0">
                  {profile.active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <Badge variant="secondary" className="font-normal">
                {PERSON_TYPE_LABELS[profile.personType as PersonType] ?? profile.personType}
              </Badge>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5 shrink-0" />
                  {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
                </span>
                {profile.createdAt && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(profile.createdAt)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-orange" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ProfileTable({ profiles }: { profiles: Profile[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Libellé</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden sm:table-cell">Permissions</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="hidden md:table-cell">Créé le</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => (
            <TableRow
              key={profile.id}
              className="cursor-pointer"
              onClick={() => void navigate(`/admin/profiles/${profile.id}/edit`)}
            >
              <TableCell className="font-medium">{profile.label}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {PERSON_TYPE_LABELS[profile.personType as PersonType] ?? profile.personType}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell tabular-nums">
                {profile.permission?.length ?? 0}
              </TableCell>
              <TableCell>
                <Badge variant={profile.active ? 'success' : 'destructive'}>
                  {profile.active ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                {profile.createdAt ? formatDate(profile.createdAt) : '—'}
              </TableCell>
              <TableCell>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ProfilesPage() {
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ProfileViewMode>(readProfilesViewMode)
  const { data, isLoading, isFetching } = useProfiles({ page, itemsPerPage: ITEMS_PER_PAGE })

  const handleViewModeChange = (mode: ProfileViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES_VIEW, mode)
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
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Profils</h1>
          </div>
          {data && (
            <p className="pl-11 text-sm text-muted-foreground">
              {data.totalItems} profil{data.totalItems !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 rounded-full px-4 shadow-sm">
          <Link to="/admin/profiles/new">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Nouveau profil</span>
          </Link>
        </Button>
      </div>

      <div className="hidden lg:flex justify-end">
        <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des profils..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Shield}
          title="Aucun profil"
          description="Créez un profil pour définir les permissions des utilisateurs."
          action={{ label: 'Nouveau profil', onClick: () => { window.location.href = '/admin/profiles/new' } }}
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
            {data.items.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <ProfileTable profiles={data.items} />
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
