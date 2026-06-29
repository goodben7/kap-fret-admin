import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowLeft, Banknote, Pencil, Star } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrencies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { getCurrencyIssuingOfficeLabel } from '@/lib/currency-resource'
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

export function CurrencyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const currencyId = id ?? ''
  const { data: currency, isLoading } = useCurrency(currencyId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement de la devise..." />
      </div>
    )
  }

  if (!currency) {
    return (
      <EmptyState
        icon={Banknote}
        title="Devise introuvable"
        description="Cette devise n'existe pas ou a été supprimée."
        action={{ label: 'Retour à la liste', onClick: () => { window.location.href = '/admin/currencies' } }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/currencies"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Devises
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Devise</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-2xl font-bold tracking-tight">{currency.code}</h1>
                <span className="text-xl font-semibold text-muted-foreground">{currency.symbol}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{currency.label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={currency.active ? 'success' : 'destructive'}>
                {currency.active ? 'Actif' : 'Inactif'}
              </Badge>
              {currency.isDefault && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Par défaut
                </Badge>
              )}
              {currency.deleted && (
                <Badge variant="destructive">Supprimé</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Banknote className="h-4 w-4" aria-hidden="true" />
            </span>
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DetailRow label="Code" value={currency.code} mono />
          <DetailRow label="Libellé" value={currency.label} />
          <DetailRow label="Symbole" value={currency.symbol} />
          <DetailRow label="Bureau d'émission" value={getCurrencyIssuingOfficeLabel(currency)} />
          {currency.createdAt && (
            <DetailRow label="Créé le" value={formatDateTime(currency.createdAt)} />
          )}
          {currency.updatedAt && (
            <DetailRow label="Modifié le" value={formatDateTime(currency.updatedAt)} />
          )}
        </CardContent>
      </Card>

      <div className="hidden justify-end pt-2 lg:flex">
        <Button asChild className="h-11 rounded-xl px-8">
          <Link to={`/admin/currencies/${currency.id}/edit`}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Modifier la devise
          </Link>
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button asChild className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90">
            <Link to={`/admin/currencies/${currency.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
