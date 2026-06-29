import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowLeftRight, Trash2 } from 'lucide-react'
import { useDeleteExchangeRate, useExchangeRate, useUpdateExchangeRate } from '@/hooks/useExchangeRates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  formatExchangeRateEquation,
  formatExchangeRatePair,
  getExchangeRateCurrencyLabel,
} from '@/lib/exchange-rate'
import { cn, formatDateTime } from '@/lib/utils'

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

export function ExchangeRateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const rateId = id ?? ''
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: rate, isLoading } = useExchangeRate(rateId)
  const updateRate = useUpdateExchangeRate()
  const deleteRate = useDeleteExchangeRate()

  const handleToggleActive = async () => {
    if (!rate) return
    await updateRate.mutateAsync({
      id: rate.id,
      payload: { active: !rate.active },
    })
  }

  const handleDelete = async () => {
    if (!rate) return
    await deleteRate.mutateAsync(rate.id)
    setDeleteOpen(false)
    void navigate('/admin/exchange-rates')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement du taux de change..." />
      </div>
    )
  }

  if (!rate) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="Taux introuvable"
        description="Ce taux de change n'existe pas ou a été supprimé."
        action={{ label: 'Retour à la liste', onClick: () => { window.location.href = '/admin/exchange-rates' } }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/exchange-rates"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Taux de change
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paire</p>
              <h1 className="mt-0.5 font-mono text-2xl font-bold tracking-tight">{formatExchangeRatePair(rate)}</h1>
              <p className="mt-1 text-sm font-medium">{formatExchangeRateEquation(rate)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={rate.active ? 'success' : 'destructive'}>
                {rate.active ? 'Actif' : 'Inactif'}
              </Badge>
              {rate.deleted && <Badge variant="destructive">Supprimé</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            </span>
            Détails
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DetailRow label="Devise source" value={getExchangeRateCurrencyLabel(rate.baseCurrency)} />
          <DetailRow label="Devise cible" value={getExchangeRateCurrencyLabel(rate.targetCurrency)} />
          <DetailRow label="Montant source" value={rate.baseRate} mono />
          <DetailRow label="Montant cible" value={rate.targetRate} mono />
          <DetailRow label="Taux calculé" value={rate.rate} mono />
          {rate.createdAt && <DetailRow label="Créé le" value={formatDateTime(rate.createdAt)} />}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <label
            className={cn(
              'flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors',
              rate.active ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-border/80 bg-muted/20',
            )}
          >
            <div>
              <p className="text-sm font-medium">Taux actif</p>
              <p className="text-xs text-muted-foreground">Active ou désactive ce taux de conversion</p>
            </div>
            <input
              type="checkbox"
              checked={rate.active}
              disabled={updateRate.isPending}
              onChange={() => void handleToggleActive()}
              className="h-5 w-5 shrink-0 rounded border-input accent-brand-orange disabled:opacity-50"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Supprimer le taux
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer le taux de change"
        description="Ce taux sera définitivement supprimé. Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteRate.isPending}
      />
    </div>
  )
}
