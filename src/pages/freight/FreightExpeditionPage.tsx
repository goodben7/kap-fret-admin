import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckSquare,
  Loader2,
  MapPin,
  Package,
  Plane,
  Scale,
  Send,
  Square,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useFreight, useMarkFreightShipmentsSent } from '@/hooks/useFreight'
import { useAuth } from '@/hooks/useAuth'
import { useIssuingOffice } from '@/hooks/useIssuingOffices'
import { FREIGHT_STATUS, FREIGHT_STATUS_LABELS, freightStatusBadgeVariant } from '@/constants/freight'
import { normalizeCurrency } from '@/constants/ticket'
import {
  formatFreightCheckpointLabel,
  formatFreightWeight,
} from '@/lib/freight'
import { extractResourceId } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { getCheckpointIri } from '@/services/issuing-office.service'
import { getUpcomingFlightTravelDateInput } from '@/lib/ticket'
import { formatDate, formatMoney, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import type { FreightShipment } from '@/types/freight-shipment'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const expeditionFilterSchema = z.object({
  loadingPlace: z.string().min(1, 'Lieu de chargement requis'),
  unloadingPlace: z.string().min(1, 'Lieu de déchargement requis'),
  shipmentDate: z.string().min(1, 'Date de vol requise'),
})

type ExpeditionFilterForm = z.infer<typeof expeditionFilterSchema>

type AppliedFilters = ExpeditionFilterForm | null

function ShipmentRow({
  shipment,
  selected,
  onToggle,
  disabled,
}: {
  shipment: FreightShipment
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  const currency = normalizeCurrency(shipment.currency)
  const weight = shipment.totalWeight ?? '0'
  const packages = shipment.packageCount ?? shipment.packages?.length ?? 0

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors',
        selected
          ? 'border-brand-orange/50 bg-brand-orange/5'
          : 'border-border/80 bg-card hover:border-brand-orange/30',
        disabled && 'opacity-60',
      )}
    >
      <span className="mt-0.5 text-brand-orange" aria-hidden="true">
        {selected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">{shipment.ltaNumber}</span>
          <Badge variant={freightStatusBadgeVariant(shipment.status)}>
            {FREIGHT_STATUS_LABELS[shipment.status]}
          </Badge>
        </div>
        <p className="truncate text-sm font-medium">{shipment.senderName} → {shipment.receiverName}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {packages} colis
          </span>
          <span className="inline-flex items-center gap-1">
            <Scale className="h-3.5 w-3.5" />
            {formatFreightWeight(weight)}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatMoney(parseFloat(shipment.totalAmount) || 0, currency)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {formatFreightCheckpointLabel(shipment.loadingPlace)}
          {' → '}
          {formatFreightCheckpointLabel(shipment.unloadingPlace)}
        </p>
      </div>
      <Link
        to={`/freight/${shipment.id}`}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Voir ${shipment.ltaNumber}`}
      >
        <ArrowRight className="h-4 w-4" />
      </Link>
    </button>
  )
}

export function FreightExpeditionPage() {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const issuingOfficeId = extractResourceId(issuingOfficeIri) ?? ''
  const { data: issuingOffice } = useIssuingOffice(issuingOfficeId)
  const userCheckpointIri = useMemo(
    () => (issuingOffice ? getCheckpointIri(issuingOffice) : ''),
    [issuingOffice],
  )
  const departurePrefillDone = useRef(false)

  const [applied, setApplied] = useState<AppliedFilters>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpeditionFilterForm>({
    resolver: zodResolver(expeditionFilterSchema),
    defaultValues: {
      loadingPlace: '',
      unloadingPlace: '',
      shipmentDate: getUpcomingFlightTravelDateInput(),
    },
  })

  const loadingPlace = watch('loadingPlace')
  const unloadingPlace = watch('unloadingPlace')

  useEffect(() => {
    if (departurePrefillDone.current || !userCheckpointIri) return
    if (loadingPlace) {
      departurePrefillDone.current = true
      return
    }
    setValue('loadingPlace', userCheckpointIri, { shouldValidate: true })
    departurePrefillDone.current = true
  }, [userCheckpointIri, loadingPlace, setValue])

  const queryFilters = useMemo(() => {
    if (!applied) return null
    return {
      status: FREIGHT_STATUS.PENDING,
      shipmentDate: applied.shipmentDate,
      loadingPlace: applied.loadingPlace,
      unloadingPlace: applied.unloadingPlace,
      page: 1,
      itemsPerPage: 200,
    }
  }, [applied])

  const { data, isLoading, isError, refetch, isFetching } = useFreight(
    queryFilters ?? {},
    { enabled: !!queryFilters },
  )
  const markSent = useMarkFreightShipmentsSent()

  const shipments = useMemo(() => {
    if (!applied) return []
    return (data?.items ?? []).filter((s) => s.status === FREIGHT_STATUS.PENDING)
  }, [applied, data?.items])

  const allSelected = shipments.length > 0 && shipments.every((s) => selectedIds.has(s.id))
  const selectedCount = shipments.filter((s) => selectedIds.has(s.id)).length

  useEffect(() => {
    setSelectedIds(new Set())
  }, [applied])

  const onSearch = handleSubmit((form) => {
    setApplied({ ...form })
  })

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(shipments.map((s) => s.id)))
  }

  const handleConfirm = async () => {
    const ids = shipments.filter((s) => selectedIds.has(s.id)).map((s) => s.id)
    if (ids.length === 0) return
    const result = await markSent.mutateAsync(ids)
    setConfirmOpen(false)
    if (result.succeeded.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of result.succeeded) next.delete(id)
        return next
      })
      void refetch()
    }
  }

  const pending = markSent.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28 lg:max-w-4xl lg:pb-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link to="/freight" aria-label="Retour fret">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Expédition</h1>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les LTA en attente vraiment parties sur le vol
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vol / trajet
          </p>
          <form onSubmit={(e) => void onSearch(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CheckpointAsyncSelect
                label="Chargement"
                value={loadingPlace}
                initialCheckpointIri={userCheckpointIri || undefined}
                onChange={(iri) => setValue('loadingPlace', iri, { shouldValidate: true })}
                error={errors.loadingPlace?.message}
                placeholder="Départ..."
              />
              <CheckpointAsyncSelect
                label="Déchargement"
                value={unloadingPlace}
                onChange={(iri) => setValue('unloadingPlace', iri, { shouldValidate: true })}
                error={errors.unloadingPlace?.message}
                placeholder="Arrivée..."
              />
            </div>
            <Input
              label="Date du vol"
              type="date"
              className={fieldClass}
              error={errors.shipmentDate?.message}
              {...register('shipmentDate')}
            />
            <Button type="submit" className="h-11 w-full rounded-xl sm:w-auto">
              <Plane className="h-4 w-4" />
              Afficher les LTA en attente
            </Button>
          </form>
        </CardContent>
      </Card>

      {!applied ? (
        <EmptyState
          icon={Plane}
          title="Choisir un vol"
          description="Indiquez la date et le trajet pour lister les LTA PENDING à embarquer."
        />
      ) : isLoading ? (
        <LoadingSpinner label="Chargement des LTA..." />
      ) : isError ? (
        <EmptyState
          title="Impossible de charger les LTA"
          action={
            <Button type="button" onClick={() => void refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : shipments.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucune LTA en attente"
          description={`Pas d’expédition PENDING pour ${formatDate(applied.shipmentDate)} sur ce trajet.`}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {shipments.length} LTA · {formatDate(applied.shipmentDate)}
                {isFetching && !isLoading ? ' · actualisation…' : ''}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={toggleAll}
              disabled={pending}
            >
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
          </div>

          <div className="space-y-2">
            {shipments.map((shipment) => (
              <ShipmentRow
                key={shipment.id}
                shipment={shipment}
                selected={selectedIds.has(shipment.id)}
                onToggle={() => toggleOne(shipment.id)}
                disabled={pending}
              />
            ))}
          </div>
        </div>
      )}

      {applied && shipments.length > 0 && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:static lg:inset-auto lg:z-auto lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-3xl items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:max-w-4xl lg:px-0 lg:pb-0">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold tabular-nums">
                {selectedCount} sélectionnée{selectedCount !== 1 ? 's' : ''}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Passeront au statut Expédié (SENT)
              </p>
            </div>
            <Button
              type="button"
              className="h-11 shrink-0 rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90"
              disabled={selectedCount === 0 || pending}
              onClick={() => setConfirmOpen(true)}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Marquer expédié
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmOpen(false)
        }}
        variant="warning"
        title="Marquer comme expédiées ?"
        description={`${selectedCount} LTA passeront au statut Expédié. Cette action correspond au chargement réel du vol.`}
        confirmLabel="Oui, marquer expédié"
        cancelLabel="Annuler"
        onConfirm={handleConfirm}
        loading={pending}
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{applied ? formatDate(applied.shipmentDate) : '—'}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Trajet</span>
            <span className="text-right font-medium">
              {applied ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {formatFreightCheckpointLabel(applied.loadingPlace)}
                  </span>
                  <br />
                  → {formatFreightCheckpointLabel(applied.unloadingPlace)}
                </>
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
