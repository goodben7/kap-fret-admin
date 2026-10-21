import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Calendar, Download, FileText, LoaderIcon, MapPin, Receipt, Users } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import { ManifestPassengerPicker } from '@/components/tickets/ManifestPassengerPicker'
import {
  passengerManifestSchema,
  type PassengerManifestFormData,
} from '@/schemas/passenger-manifest.schema'
import { useAuth } from '@/hooks/useAuth'
import { useIssuingOffice } from '@/hooks/useIssuingOffices'
import { ticketService } from '@/services/ticket.service'
import { checkpointService } from '@/services/checkpoint.service'
import { getCheckpointId } from '@/lib/checkpoint'
import { extractResourceId } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { getCheckpointIri } from '@/services/issuing-office.service'
import { isAxiosError } from 'axios'
import { extractApiErrorMessage } from '@/services/api'
import { getDefaultWednesdayTravelDateInput } from '@/lib/ticket'
import { formatDate, cn } from '@/lib/utils'
import {
  buildTicketSalesManifestFileName,
  downloadBlob,
  prepareTicketsForSalesManifest,
  generateTicketSalesManifestPdf,
  getCheckpointManifestName,
  getCheckpointRouteCode,
  resolveTicketSalesManifestFlightNumber,
} from '@/lib/ticket-sales-manifest-pdf'
import { toast } from 'sonner'
import type { Ticket } from '@/types/ticket'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface TicketSalesManifestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TicketSalesManifestModal({ open, onOpenChange }: TicketSalesManifestModalProps) {
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [ticketCount, setTicketCount] = useState(0)
  const [fileName, setFileName] = useState('MANIFESTE_VENTE_BILLETS.pdf')
  const [departureLabel, setDepartureLabel] = useState('')
  const [destinationLabel, setDestinationLabel] = useState('')
  const [loadedTickets, setLoadedTickets] = useState<Ticket[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const departurePrefillDone = useRef(false)

  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const issuingOfficeId = extractResourceId(issuingOfficeIri) ?? ''
  const { data: issuingOffice } = useIssuingOffice(issuingOfficeId)
  const userCheckpointIri = useMemo(
    () => (issuingOffice ? getCheckpointIri(issuingOffice) : ''),
    [issuingOffice],
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PassengerManifestFormData>({
    resolver: zodResolver(passengerManifestSchema),
    defaultValues: {
      departure: '',
      destination: '',
      travelDate: getDefaultWednesdayTravelDateInput(),
    },
  })

  const departure = watch('departure')
  const destination = watch('destination')
  const travelDate = watch('travelDate')

  const resolveCheckpoint = useCallback(async (iri: string) => {
    const id = getCheckpointId(iri)
    if (!id) return iri
    try {
      return await checkpointService.getById(id)
    } catch {
      return iri
    }
  }, [])

  useEffect(() => {
    if (!open) {
      departurePrefillDone.current = false
      return
    }
    reset({
      departure: '',
      destination: '',
      travelDate: getDefaultWednesdayTravelDateInput(),
    })
    setDepartureLabel('')
    setDestinationLabel('')
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setPdfBlob(null)
    setTicketCount(0)
    setFileName('MANIFESTE_VENTE_BILLETS.pdf')
    setLoadedTickets([])
    setSelectedIds(new Set())
  }, [open, reset])

  const clearPreview = () => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setPdfBlob(null)
    setTicketCount(0)
  }

  const togglePassenger = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    clearPreview()
  }

  const selectAllPassengers = () => {
    setSelectedIds(new Set(loadedTickets.map((ticket) => ticket.id)))
    clearPreview()
  }

  const clearPassengerSelection = () => {
    setSelectedIds(new Set())
    clearPreview()
  }

  useEffect(() => {
    if (!open || !userCheckpointIri || departurePrefillDone.current) return
    setValue('departure', userCheckpointIri, { shouldValidate: true })
    departurePrefillDone.current = true
  }, [open, userCheckpointIri, setValue])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    setLoadedTickets([])
    setSelectedIds(new Set())
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setPdfBlob(null)
    setTicketCount(0)
  }, [departure, destination, travelDate])

  useEffect(() => {
    if (!departure) {
      setDepartureLabel('')
      return
    }
    let cancelled = false
    void resolveCheckpoint(departure).then((checkpoint) => {
      if (!cancelled) setDepartureLabel(getCheckpointManifestName(checkpoint))
    })
    return () => {
      cancelled = true
    }
  }, [departure, resolveCheckpoint])

  useEffect(() => {
    if (!destination) {
      setDestinationLabel('')
      return
    }
    let cancelled = false
    void resolveCheckpoint(destination).then((checkpoint) => {
      if (!cancelled) setDestinationLabel(getCheckpointManifestName(checkpoint))
    })
    return () => {
      cancelled = true
    }
  }, [destination, resolveCheckpoint])

  const canLoad = !!departure?.trim() && !!destination?.trim() && !!travelDate?.trim()
  const canGenerate = selectedIds.size > 0
  const hasRouteSummary = !!departureLabel && !!destinationLabel && !!travelDate

  const loadTickets = handleSubmit(async (data) => {
    setIsLoadingList(true)
    clearPreview()
    try {
      const { items } = await ticketService.getAll({
        departure: data.departure,
        destination: data.destination,
        travelDate: data.travelDate,
        itemsPerPage: 500,
        page: 1,
      })
      const tickets = prepareTicketsForSalesManifest(items)
      if (tickets.length === 0) {
        setLoadedTickets([])
        setSelectedIds(new Set())
        toast.error('Aucun billet trouvé pour ce trajet et cette date')
        return
      }
      setLoadedTickets(tickets)
      setSelectedIds(new Set(tickets.map((ticket) => ticket.id)))
      toast.success(`${tickets.length} billet${tickets.length !== 1 ? 's' : ''} chargé${tickets.length !== 1 ? 's' : ''}`)
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de charger les billets')
      }
    } finally {
      setIsLoadingList(false)
    }
  })

  const generate = handleSubmit(async (data) => {
    if (selectedIds.size === 0) {
      toast.error('Sélectionnez au moins un billet')
      return
    }
    setIsGenerating(true)
    try {
      const [departureCheckpoint, destinationCheckpoint] = await Promise.all([
        resolveCheckpoint(data.departure),
        resolveCheckpoint(data.destination),
      ])

      const tickets = loadedTickets.filter((ticket) => selectedIds.has(ticket.id))
      if (tickets.length === 0) {
        toast.error('Aucun billet sélectionné')
        return
      }

      const departureCode = getCheckpointRouteCode(departureCheckpoint)
      const destinationCode = getCheckpointRouteCode(destinationCheckpoint)
      const flightNumber = resolveTicketSalesManifestFlightNumber(
        data.travelDate,
        departureCode,
        destinationCode,
      )

      const blob = await generateTicketSalesManifestPdf({
        departureLabel: getCheckpointManifestName(departureCheckpoint),
        destinationLabel: getCheckpointManifestName(destinationCheckpoint),
        departureCode,
        destinationCode,
        travelDate: data.travelDate,
        flightNumber,
        tickets,
      })

      const nextFileName = buildTicketSalesManifestFileName({
        departureCode,
        destinationCode,
        travelDate: data.travelDate,
      })

      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(blob)
      })
      setPdfBlob(blob)
      setTicketCount(tickets.length)
      setFileName(nextFileName)
      toast.success(`Manifeste vente généré (${tickets.length} billet${tickets.length !== 1 ? 's' : ''})`)
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de générer le manifeste vente')
      }
    } finally {
      setIsGenerating(false)
    }
  })

  const handleDownload = () => {
    if (!pdfBlob) return
    downloadBlob(pdfBlob, fileName)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && !isGenerating) onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Manifeste vente billets"
      description="Chargez les billets du vol, décochez ceux à exclure, puis générez le PDF commercial."
      className={cn(
        'rounded-2xl',
        previewUrl ? 'sm:max-w-[min(96vw,72rem)]' : 'sm:max-w-xl',
      )}
    >
      <form onSubmit={(e) => void generate(e)} className="space-y-4">
        <div
          className={cn(
            'grid gap-4',
            previewUrl && 'lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start',
          )}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
                Trajet
              </p>
              <div className="grid grid-cols-1 gap-4">
                <CheckpointAsyncSelect
                  label="Départ"
                  value={departure}
                  initialCheckpointIri={userCheckpointIri || undefined}
                  onChange={(iri) => setValue('departure', iri, { shouldValidate: true })}
                  error={errors.departure?.message}
                  placeholder="Choisir le point de départ..."
                  variant="filter"
                />
                <CheckpointAsyncSelect
                  label="Destination"
                  value={destination}
                  onChange={(iri) => setValue('destination', iri, { shouldValidate: true })}
                  error={errors.destination?.message}
                  placeholder="Choisir la destination..."
                  variant="filter"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
                Date de voyage
              </p>
              <Input
                label="Date du vol"
                type="date"
                className={fieldClass}
                error={errors.travelDate?.message}
                {...register('travelDate')}
              />
            </div>

            {hasRouteSummary && (
              <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Récapitulatif
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span>{departureLabel}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden="true" />
                  <span>{destinationLabel}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(travelDate)}</p>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl"
              disabled={isLoadingList || !canLoad}
              onClick={() => void loadTickets()}
            >
              {isLoadingList ? (
                <>
                  <LoaderIcon />
                  Chargement...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Charger les billets
                </>
              )}
            </Button>

            {loadedTickets.length > 0 && (
              <ManifestPassengerPicker
                tickets={loadedTickets}
                selectedIds={selectedIds}
                onToggle={togglePassenger}
                onSelectAll={selectAllPassengers}
                onClear={clearPassengerSelection}
                disabled={isGenerating || isLoadingList}
              />
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                className="h-11 flex-1 rounded-xl bg-brand-orange hover:bg-brand-orange/90"
                disabled={isGenerating || !canGenerate}
              >
                {isGenerating ? (
                  <>
                    <LoaderIcon />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Générer l&apos;aperçu
                  </>
                )}
              </Button>
              {pdfBlob && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  Télécharger
                </Button>
              )}
            </div>

            {!canLoad && (
              <p className="text-xs text-muted-foreground">
                Renseignez le départ, la destination et la date pour charger les billets.
              </p>
            )}
          </div>

          {previewUrl ? (
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/20">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Receipt className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                  Aperçu du manifeste vente
                </div>
                <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange">
                  {ticketCount} billet{ticketCount !== 1 ? 's' : ''}
                </span>
              </div>
              <iframe
                title="Aperçu manifeste vente billets"
                src={previewUrl}
                className="h-[min(82vh,860px)] w-full bg-white"
              />
            </div>
          ) : (
            <div className="hidden rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-10 text-center lg:flex lg:min-h-[320px] lg:flex-col lg:items-center lg:justify-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-medium text-muted-foreground">Aperçu du PDF</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground/80">
                Le manifeste vente s&apos;affichera ici après génération.
              </p>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
