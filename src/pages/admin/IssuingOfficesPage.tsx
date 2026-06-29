import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  LayoutGrid,
  Phone,
  Plus,
  Table2,
  UserPlus,
} from 'lucide-react'
import { useIssuingOffices } from '@/hooks/useIssuingOffices'
import { OfficeAdminCreateModal } from '@/components/admin/OfficeAdminCreateModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { getIssuingOfficeCurrencyCode } from '@/lib/issuing-office'
import { cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants/storage'
import type { IssuingOffice } from '@/types/issuing-office'

const ITEMS_PER_PAGE = 20

type OfficesViewMode = 'cards' | 'table'

function readOfficesViewMode(): OfficesViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ISSUING_OFFICES_VIEW)
    return stored === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: OfficesViewMode
  onChange: (mode: OfficesViewMode) => void
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

function OfficeCard({
  office,
  onCreateAdmin,
}: {
  office: IssuingOffice
  onCreateAdmin: (office: IssuingOffice) => void
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/admin/issuing-offices/${office.id}`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold leading-tight truncate">{office.name}</p>
                <Badge variant={office.active ? 'success' : 'destructive'} className="shrink-0">
                  {office.active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="font-mono text-xs font-semibold text-primary truncate">{office.code}</p>
              {getIssuingOfficeCurrencyCode(office.currency) && (
                <Badge variant="secondary" className="font-mono font-normal">
                  {getIssuingOfficeCurrencyCode(office.currency)}
                </Badge>
              )}
              {office.phone && (
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {office.phone}
                </p>
              )}
              <Badge variant={office.adminAccountCreated ? 'success' : 'secondary'} className="font-normal">
                Admin {office.adminAccountCreated ? 'créé' : 'à créer'}
              </Badge>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-orange" />
          </div>
        </Link>

        <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/issuing-offices/${office.id}`}>Voir</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="h-10 flex-1 rounded-xl">
            <Link to={`/admin/issuing-offices/${office.id}/edit`}>Modifier</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            disabled={office.adminAccountCreated === true}
            aria-label="Créer l'administrateur"
            title={
              office.adminAccountCreated
                ? 'Administrateur déjà créé'
                : 'Créer l\'administrateur du bureau'
            }
            onClick={() => onCreateAdmin(office)}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OfficeTable({
  offices,
  onCreateAdmin,
}: {
  offices: IssuingOffice[]
  onCreateAdmin: (office: IssuingOffice) => void
}) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead className="hidden md:table-cell">Devise</TableHead>
            <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offices.map((office) => (
            <TableRow key={office.id}>
              <TableCell
                className="cursor-pointer font-mono text-xs"
                onClick={() => void navigate(`/admin/issuing-offices/${office.id}`)}
              >
                {office.code}
              </TableCell>
              <TableCell
                className="cursor-pointer font-medium"
                onClick={() => void navigate(`/admin/issuing-offices/${office.id}`)}
              >
                {office.name}
              </TableCell>
              <TableCell className="hidden md:table-cell font-mono text-xs">
                {getIssuingOfficeCurrencyCode(office.currency) ?? '—'}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">{office.phone ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={office.adminAccountCreated ? 'success' : 'secondary'}>
                  {office.adminAccountCreated ? 'Créé' : 'À créer'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={office.active ? 'success' : 'destructive'}>
                  {office.active ? 'Actif' : 'Inactif'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/issuing-offices/${office.id}`}>Voir</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/issuing-offices/${office.id}/edit`}>Modifier</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={office.adminAccountCreated === true}
                    aria-label="Créer l'administrateur"
                    onClick={() => onCreateAdmin(office)}
                  >
                    <UserPlus className="h-4 w-4" />
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

export function IssuingOfficesPage() {
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<OfficesViewMode>(readOfficesViewMode)
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [selectedOffice, setSelectedOffice] = useState<IssuingOffice | null>(null)

  const { data, isLoading, isFetching } = useIssuingOffices({ page, itemsPerPage: ITEMS_PER_PAGE })

  const openAdminModal = (office: IssuingOffice) => {
    setSelectedOffice(office)
    setAdminModalOpen(true)
  }

  const handleViewModeChange = (mode: OfficesViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.ISSUING_OFFICES_VIEW, mode)
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
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Bureaux d'émission</h1>
          </div>
          {data && (
            <p className="pl-11 text-sm text-muted-foreground">
              {data.totalItems} bureau{data.totalItems !== 1 ? 'x' : ''}
            </p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 rounded-full px-4 shadow-sm">
          <Link to="/admin/issuing-offices/new">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Nouveau</span>
          </Link>
        </Button>
      </div>

      <div className="hidden lg:flex justify-end">
        <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement des bureaux..." />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={Building2}
          title="Aucun bureau d'émission"
          description="Créez un bureau pour rattacher les agents et les points de vente."
          action={{ label: 'Nouveau bureau', onClick: () => { window.location.href = '/admin/issuing-offices/new' } }}
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
            {data.items.map((office) => (
              <OfficeCard key={office.id} office={office} onCreateAdmin={openAdminModal} />
            ))}
          </div>

          <div
            className={cn(
              'hidden',
              viewMode === 'table' && 'lg:block',
              isFetching && 'opacity-60 pointer-events-none transition-opacity',
            )}
          >
            <OfficeTable offices={data.items} onCreateAdmin={openAdminModal} />
          </div>

          <Pagination
            page={page}
            totalItems={data.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        </>
      )}

      <OfficeAdminCreateModal
        office={selectedOffice}
        open={adminModalOpen}
        onOpenChange={(open) => {
          setAdminModalOpen(open)
          if (!open) setSelectedOffice(null)
        }}
      />
    </div>
  )
}
