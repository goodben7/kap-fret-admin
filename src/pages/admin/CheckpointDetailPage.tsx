import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowLeft, MapPin, Pencil } from 'lucide-react'
import { useCheckpoint } from '@/hooks/useCheckpoints'
import { getProvinceLabel } from '@/lib/province'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

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

export function CheckpointDetailPage() {
  const { id } = useParams<{ id: string }>()
  const checkpointId = id ?? ''
  const { data: checkpoint, isLoading } = useCheckpoint(checkpointId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement du checkpoint..." />
      </div>
    )
  }

  if (!checkpoint) {
    return (
      <EmptyState
        icon={MapPin}
        title="Checkpoint introuvable"
        description="Ce checkpoint n'existe pas ou a été supprimé."
        action={{ label: 'Retour à la liste', onClick: () => { window.location.href = '/admin/checkpoints' } }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/checkpoints"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Checkpoints
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checkpoint</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{checkpoint.label}</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{checkpoint.id}</p>
            </div>
            <Badge variant={checkpoint.active ? 'success' : 'destructive'}>
              {checkpoint.active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            Détails
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DetailRow label="Libellé" value={checkpoint.label} />
          <DetailRow label="Province" value={getProvinceLabel(checkpoint.province)} />
          <DetailRow label="Latitude" value={checkpoint.latitude} />
          <DetailRow label="Longitude" value={checkpoint.longitude} />
        </CardContent>
      </Card>

      <div className="hidden justify-end pt-2 lg:flex">
        <Button asChild className="h-11 rounded-xl px-8">
          <Link to={`/admin/checkpoints/${checkpoint.id}/edit`}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Modifier le checkpoint
          </Link>
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button asChild className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90">
            <Link to={`/admin/checkpoints/${checkpoint.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
