import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckSquare,
  Loader2,
  MapPin,
  Plane,
  Square,
  UserCheck,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCheckIns } from '@/hooks/useCheckIns'
import { useBoardTicket } from '@/hooks/useTickets'
import { useAuth } from '@/hooks/useAuth'
import { useIssuingOffice } from '@/hooks/useIssuingOffices'
import { CHECK_IN_STATUS } from '@/constants/check-in'
import { TICKET_STATUS, TICKET_STATUS_LABELS } from '@/constants/ticket'
import {
  getCheckInPassengerName,
  getCheckInTicketId,
  getCheckInTicketNumber,
} from '@/lib/check-in'
import { extractResourceId } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { getCheckpointIri } from '@/services/issuing-office.service'
import { getUpcomingFlightTravelDateInput } from '@/lib/ticket'
import { formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import type { CheckIn } from '@/types/check-in'
import type { Ticket } from '@/types/ticket'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const boardingFilterSchema = z.object({
  departure: z.string().min(1, 'Départ requis'),
  destination: z.string().min(1, 'Destination requise'),
  travelDate: z.string().min(1, 'Date de vol requise'),
})

type BoardingFilterForm = z.infer<typeof boardingFilterSchema>
type AppliedFilters = BoardingFilterForm | null

function resolveTicket(checkIn: CheckIn): Ticket | null {
  return typeof checkIn.ticket === 'object' ? checkIn.ticket : null
}

function PassengerRow({
  checkIn,
  selected,
  onToggle,
  disabled,
}: {
  checkIn: CheckIn
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  const ticket = resolveTicket(checkIn)
  const ticketNumber = getCheckInTicketNumber(checkIn)
  const passengerName = getCheckInPassengerName(checkIn) ?? '—'
  const status = ticket?.status

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
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">{ticketNumber}</span>
          {status && (
            <Badge variant="outline">
              {TICKET_STATUS_LABELS[status] ?? status}
            </Badge>
          )}
        </div>
        <p className="truncate text-sm font-medium">{passengerName}</p>
      </div>
      {getCheckInTicketId(checkIn) && (
        <Link
          to={`/tickets/${getCheckInTicketId(checkIn)}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Voir ${ticketNumber}`}
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </button>
  )
}

export function BoardingPage() {
  const { user } = useAuth()
  const boardTicket = useBoardTicket()
  const [applied, setApplied] = useState<AppliedFilters>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [identityChecked, setIdentityChecked] = useState(false)
  const [boarding, setBoarding] = useState(false)
  const departurePrefillDone = useRef(false)

  const userOfficeIri = resolveUserIssuingOfficeIri(user)
  const officeId = extractResourceId(userOfficeIri)
  const { data: office } = useIssuingOffice(officeId ?? '')
  const userCheckpointIri = office ? getCheckpointIri(office) : undefined

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BoardingFilterForm>({
    resolver: zodResolver(boardingFilterSchema),
    defaultValues: {
      departure: '',
      destination: '',
      travelDate: getUpcomingFlightTravelDateInput(),
    },
  })

  const departure = watch('departure')
  const destination = watch('destination')

  useEffect(() => {
    if (departurePrefillDone.current || !userCheckpointIri) return
    setValue('departure', userCheckpointIri, { shouldValidate: true })
    departurePrefillDone.current = true
  }, [userCheckpointIri, setValue])

  const { data, isLoading, isFetching } = useCheckIns(
    {
      travelDate: applied?.travelDate,
      departure: applied?.departure,
      destination: applied?.destination,
      status: CHECK_IN_STATUS.CREATED,
      ticketStatus: TICKET_STATUS.ISSUED,
      itemsPerPage: 200,
      page: 1,
      orderField: 'ticket.passengerName',
      orderDirection: 'asc',
    },
    !!applied,
  )

  const readyPassengers = useMemo(() => {
    if (!applied) return []
    return (data?.items ?? []).filter((checkIn) => {
      const ticket = resolveTicket(checkIn)
      if (!ticket) return checkIn.status === CHECK_IN_STATUS.CREATED
      return ticket.status === TICKET_STATUS.ISSUED && checkIn.status === CHECK_IN_STATUS.CREATED
    })
  }, [applied, data?.items])

  const selectedCheckIns = useMemo(
    () => readyPassengers.filter((c) => selectedIds.includes(c.id)),
    [readyPassengers, selectedIds],
  )

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectAll = () => {
    setSelectedIds(readyPassengers.map((c) => c.id))
  }

  const onApply = (form: BoardingFilterForm) => {
    setApplied(form)
    setSelectedIds([])
    setIdentityChecked(false)
  }

  const handleBoard = async () => {
    if (!identityChecked || selectedCheckIns.length === 0) return
    setBoarding(true)
    try {
      for (const checkIn of selectedCheckIns) {
        const ticketId = getCheckInTicketId(checkIn)
        if (!ticketId) continue
        await boardTicket.mutateAsync(ticketId)
      }
      setSelectedIds([])
      setConfirmOpen(false)
      setIdentityChecked(false)
    } finally {
      setBoarding(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/checkins"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Check-in
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Plane className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Passagers prêts</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Check-ins du vol — validez l&apos;identité puis marquez l&apos;embarquement (billet → Utilisé).
        </p>
      </div>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit(onApply)}
          >
            <div className="sm:col-span-2">
              <CheckpointAsyncSelect
                label="Départ"
                placeholder="Checkpoint de départ..."
                value={departure ?? ''}
                onChange={(iri) => setValue('departure', iri, { shouldValidate: true })}
                error={errors.departure?.message}
                variant="filter"
              />
            </div>
            <div className="sm:col-span-2">
              <CheckpointAsyncSelect
                label="Destination"
                placeholder="Checkpoint de destination..."
                value={destination ?? ''}
                onChange={(iri) => setValue('destination', iri, { shouldValidate: true })}
                error={errors.destination?.message}
                variant="filter"
              />
            </div>
            <Input
              label="Date de vol"
              type="date"
              className={fieldClass}
              error={errors.travelDate?.message}
              {...register('travelDate')}
            />
            <div className="flex items-end">
              <Button type="submit" className="h-11 w-full rounded-xl">
                <Calendar className="h-4 w-4" />
                Afficher les passagers
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!applied && (
        <EmptyState
          icon={UserCheck}
          title="Choisir le vol"
          description="Indiquez la date et le trajet pour lister les passagers check-inés prêts à embarquer."
        />
      )}

      {applied && (isLoading || isFetching) && (
        <div className="flex justify-center py-12">
          <LoadingSpinner label="Chargement des passagers..." />
        </div>
      )}

      {applied && !isLoading && !isFetching && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(applied.travelDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Trajet filtré
              </span>
              <span className="font-medium text-foreground">
                {readyPassengers.length} prêt{readyPassengers.length !== 1 ? 's' : ''}
              </span>
            </div>
            {readyPassengers.length > 0 && (
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={selectAll}>
                Tout sélectionner
              </Button>
            )}
          </div>

          {readyPassengers.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Aucun passager prêt"
              description="Aucun check-in actif avec billet émis pour ce vol. Effectuez d'abord le check-in."
            />
          ) : (
            <ul className="space-y-2">
              {readyPassengers.map((checkIn) => (
                <li key={checkIn.id}>
                  <PassengerRow
                    checkIn={checkIn}
                    selected={selectedIds.includes(checkIn.id)}
                    onToggle={() => toggle(checkIn.id)}
                    disabled={boarding}
                  />
                </li>
              ))}
            </ul>
          )}

          {selectedIds.length > 0 && (
            <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 p-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <Button
                type="button"
                className="h-12 w-full rounded-xl text-base font-semibold"
                onClick={() => {
                  setIdentityChecked(false)
                  setConfirmOpen(true)
                }}
                disabled={boarding}
              >
                {boarding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plane className="h-5 w-5" />
                )}
                Embarquer {selectedIds.length} passager{selectedIds.length > 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !boarding) {
            setConfirmOpen(false)
            setIdentityChecked(false)
          }
        }}
        title="Confirmer l'embarquement ?"
        description="Les billets sélectionnés passeront au statut Utilisé. Vérifiez l'identité de chaque passager."
        confirmLabel="Oui, embarquer"
        cancelLabel="Annuler"
        onConfirm={handleBoard}
        loading={boarding}
        confirmDisabled={!identityChecked}
      >
        <div className="space-y-3 text-sm">
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-3">
            {selectedCheckIns.map((checkIn) => (
              <li key={checkIn.id} className="flex justify-between gap-2">
                <span className="truncate font-medium">{getCheckInPassengerName(checkIn)}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {getCheckInTicketNumber(checkIn)}
                </span>
              </li>
            ))}
          </ul>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={identityChecked}
              onChange={(e) => setIdentityChecked(e.target.checked)}
            />
            <span>
              J&apos;ai vérifié l&apos;identité et le nom de chaque passager sélectionné
            </span>
          </label>
        </div>
      </ConfirmDialog>
    </div>
  )
}
