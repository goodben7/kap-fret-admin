import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Map,
  MapPin,
  Pencil,
  Plus,
} from 'lucide-react'
import { useProvince } from '@/hooks/useProvinces'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { cn, formatDateTime } from '@/lib/utils'
import type { ProvinceCheckpointRef } from '@/types/province'

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

function CheckpointMiniCard({ checkpoint }: { checkpoint: ProvinceCheckpointRef }) {
  const coords =
    checkpoint.latitude != null && checkpoint.longitude != null
      ? `${checkpoint.latitude}, ${checkpoint.longitude}`
      : null

  return (
    <Link to={`/admin/checkpoints/${checkpoint.id}`} className="block group">
      <Card className="rounded-xl border-border/80 shadow-sm transition-all active:scale-[0.99] group-hover:border-brand-orange/40">
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium truncate">{checkpoint.label}</p>
            {coords && (
              <p className="text-xs text-muted-foreground truncate">{coords}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={checkpoint.active ? 'success' : 'destructive'} className="text-xs">
              {checkpoint.active ? 'Actif' : 'Inactif'}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-brand-orange" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ProvinceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const provinceId = id ?? ''
  const { data: province, isLoading } = useProvince(provinceId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement de la province..." />
      </div>
    )
  }

  if (!province) {
    return (
      <EmptyState
        icon={Map}
        title="Province introuvable"
        description="Cette province n'existe pas ou a été supprimée."
        action={{ label: 'Retour à la liste', onClick: () => { window.location.href = '/admin/provinces' } }}
      />
    )
  }

  const checkpoints = province.checkpoints ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/provinces"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Provinces
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Province</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{province.label}</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{province.code}</p>
            </div>
            <Badge variant={province.active ? 'success' : 'destructive'}>
              {province.active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Map className="h-4 w-4" aria-hidden="true" />
            </span>
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DetailRow label="Libellé" value={province.label} />
          <DetailRow label="Code" value={province.code} mono />
          {province.createdAt && (
            <DetailRow label="Créé le" value={formatDateTime(province.createdAt)} />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            Checkpoints ({checkpoints.length})
          </CardTitle>
          <Button size="sm" asChild className="hidden h-9 rounded-xl sm:inline-flex">
            <Link to="/admin/checkpoints/new">
              <Plus className="h-4 w-4 mr-1" />
              Nouveau
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {checkpoints.length === 0 ? (
            <div className="space-y-4 py-2">
              <EmptyState
                title="Aucun checkpoint"
                description="Aucun checkpoint rattaché à cette province."
              />
              <Button asChild className="h-11 w-full rounded-xl sm:w-auto">
                <Link to="/admin/checkpoints/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nouveau checkpoint
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {checkpoints.map((cp) => (
                <CheckpointMiniCard key={cp.id} checkpoint={cp} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="hidden justify-end pt-2 lg:flex">
        <Button asChild className="h-11 rounded-xl px-8">
          <Link to={`/admin/provinces/${province.id}/edit`}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Modifier la province
          </Link>
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button asChild className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90">
            <Link to={`/admin/provinces/${province.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
