import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Pencil,
  User,
  UserPlus,
} from 'lucide-react'
import { useIssuingOffice, useIssuingOfficeAdmin } from '@/hooks/useIssuingOffices'
import { OfficeAdminCreateModal } from '@/components/admin/OfficeAdminCreateModal'
import { useCheckpointLabel } from '@/hooks/useCheckpoints'
import { getUserProfileLabel } from '@/types/user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { getIssuingOfficeCurrencyLabel } from '@/lib/issuing-office'
import { cn, formatDateTime } from '@/lib/utils'
import { PERSON_TYPE_LABELS } from '@/constants/profile'
import type { PersonType } from '@/constants/profile'

function DetailSection({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon: typeof Building2
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className={cn('break-words text-right text-sm font-medium', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  )
}

export function IssuingOfficeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const officeId = id ?? ''
  const [adminModalOpen, setAdminModalOpen] = useState(false)

  const { data: office, isLoading } = useIssuingOffice(officeId)
  const { label: checkpointLabel, isLoading: checkpointLoading } = useCheckpointLabel(office?.checkpoint)
  const hasAdmin = office?.adminAccountCreated === true
  const { data: admin, isLoading: adminLoading } = useIssuingOfficeAdmin(officeId, hasAdmin)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement du bureau..." />
      </div>
    )
  }

  if (!office) {
    return (
      <EmptyState
        icon={Building2}
        title="Bureau introuvable"
        description="Ce bureau d'émission n'existe pas ou a été supprimé."
        action={{ label: 'Retour à la liste', onClick: () => { window.location.href = '/admin/issuing-offices' } }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/issuing-offices"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Bureaux d'émission
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bureau</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{office.name}</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{office.code}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={office.active ? 'success' : 'destructive'}>
                {office.active ? 'Actif' : 'Inactif'}
              </Badge>
              <Badge variant={hasAdmin ? 'success' : 'secondary'}>
                Admin {hasAdmin ? 'créé' : 'à créer'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailSection title="Informations" icon={MapPin}>
        <DetailRow label="Code" value={office.code} mono />
        <DetailRow label="Nom" value={office.name} />
        <DetailRow
          label="Checkpoint"
          value={checkpointLoading ? 'Chargement...' : checkpointLabel}
        />
        <DetailRow label="Devise par défaut" value={getIssuingOfficeCurrencyLabel(office.currency)} />
        <DetailRow label="Téléphone" value={office.phone ?? '—'} />
        <DetailRow label="Adresse" value={office.address ?? '—'} />
        {office.createdAt && (
          <DetailRow label="Créé le" value={formatDateTime(office.createdAt)} />
        )}
        {office.updatedAt && (
          <DetailRow label="Modifié le" value={formatDateTime(office.updatedAt)} />
        )}
      </DetailSection>

      <DetailSection
        title="Administrateur"
        icon={User}
        action={
          !hasAdmin ? (
            <Button
              type="button"
              size="sm"
              className="hidden h-9 rounded-xl sm:inline-flex"
              onClick={() => setAdminModalOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Créer
            </Button>
          ) : admin ? (
            <Button variant="outline" size="sm" asChild className="hidden h-9 rounded-xl sm:inline-flex">
              <Link to={`/admin/users/${admin.id}/edit`}>Modifier</Link>
            </Button>
          ) : undefined
        }
      >
        {!hasAdmin ? (
          <div className="space-y-4 py-2">
            <EmptyState
              title="Aucun administrateur"
              description="Ce bureau n'a pas encore de compte administrateur."
            />
            <Button className="h-11 w-full rounded-xl sm:w-auto" onClick={() => setAdminModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Créer l'administrateur
            </Button>
          </div>
        ) : adminLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" label="Chargement de l'administrateur..." />
          </div>
        ) : !admin ? (
          <EmptyState
            title="Administrateur introuvable"
            description="Le compte admin est marqué comme créé mais n'a pas pu être chargé."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {admin.personType && (
                <Badge variant="secondary">
                  {PERSON_TYPE_LABELS[admin.personType as PersonType] ?? admin.personType}
                </Badge>
              )}
              <Badge variant={admin.locked ? 'destructive' : 'success'}>
                {admin.locked ? 'Verrouillé' : 'Actif'}
              </Badge>
              <Badge variant="outline">Profil : {getUserProfileLabel(admin)}</Badge>
            </div>
            <DetailRow label="Nom affiché" value={admin.displayName} />
            <DetailRow label="Email" value={admin.email} />
            <DetailRow label="Téléphone" value={admin.phone ?? '—'} />
            <DetailRow label="Identifiant" value={admin.id} mono />
            {admin.createdAt && (
              <DetailRow label="Créé le" value={formatDateTime(admin.createdAt)} />
            )}
            <Button variant="outline" asChild className="h-11 w-full rounded-xl sm:hidden">
              <Link to={`/admin/users/${admin.id}/edit`}>Modifier le compte</Link>
            </Button>
          </div>
        )}
      </DetailSection>

      <div className="hidden justify-end gap-3 pt-2 lg:flex">
        {!hasAdmin && (
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setAdminModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Créer l'administrateur
          </Button>
        )}
        <Button asChild className="h-11 rounded-xl px-8">
          <Link to={`/admin/issuing-offices/${office.id}/edit`}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Modifier le bureau
          </Link>
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2 p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {!hasAdmin && (
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              onClick={() => setAdminModalOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              <span className="sr-only">Créer admin</span>
            </Button>
          )}
          <Button asChild className="h-11 flex-1 rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90">
            <Link to={`/admin/issuing-offices/${office.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      <OfficeAdminCreateModal
        office={office}
        open={adminModalOpen}
        onOpenChange={setAdminModalOpen}
      />
    </div>
  )
}
