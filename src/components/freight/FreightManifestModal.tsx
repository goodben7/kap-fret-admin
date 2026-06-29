import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Calendar, Download, FileText, LoaderIcon, MapPin, Package } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import {
  freightManifestSchema,
  type FreightManifestFormData,
} from '@/schemas/freight-manifest.schema'
import { checkpointService } from '@/services/checkpoint.service'
import { getCheckpointId } from '@/lib/checkpoint'
import { isAxiosError } from 'axios'
import { extractApiErrorMessage } from '@/services/api'
import { getTodayTravelDateInput } from '@/lib/ticket'
import { formatDate, cn } from '@/lib/utils'
import {
  buildFreightManifestFileName,
  downloadBlob,
  fetchFreightShipmentsForManifest,
  generateFreightManifestPdf,
  resolveFreightManifestFlightNumber,
} from '@/lib/freight-manifest-pdf'
import {
  getCheckpointManifestName,
  getCheckpointRouteCode,
} from '@/lib/passenger-manifest-pdf'
import { toast } from 'sonner'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface FreightManifestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FreightManifestModal({ open, onOpenChange }: FreightManifestModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [shipmentCount, setShipmentCount] = useState(0)
  const [fileName, setFileName] = useState('MANIFESTE_FRET.pdf')
  const [departureLabel, setDepartureLabel] = useState('')
  const [destinationLabel, setDestinationLabel] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FreightManifestFormData>({
    resolver: zodResolver(freightManifestSchema),
    defaultValues: {
      departure: '',
      destination: '',
      shipmentDate: getTodayTravelDateInput(),
      flightNumber: '',
    },
  })

  const departure = watch('departure')
  const destination = watch('destination')
  const shipmentDate = watch('shipmentDate')

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
    if (!open) return
    reset({
      departure: '',
      destination: '',
      shipmentDate: getTodayTravelDateInput(),
      flightNumber: '',
    })
    setDepartureLabel('')
    setDestinationLabel('')
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setPdfBlob(null)
    setShipmentCount(0)
    setFileName('MANIFESTE_FRET.pdf')
  }, [open, reset])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

  const canGenerate = !!departure?.trim() && !!destination?.trim() && !!shipmentDate?.trim()
  const hasRouteSummary = !!departureLabel && !!destinationLabel && !!shipmentDate

  const generate = handleSubmit(async (data) => {
    setIsGenerating(true)
    try {
      const [departureCheckpoint, destinationCheckpoint] = await Promise.all([
        resolveCheckpoint(data.departure),
        resolveCheckpoint(data.destination),
      ])

      const shipments = await fetchFreightShipmentsForManifest(
        data.departure,
        data.destination,
        data.shipmentDate,
      )

      if (shipments.length === 0) {
        toast.error('Aucune expédition trouvée pour ce trajet et cette date')
        return
      }

      const departureCode = getCheckpointRouteCode(departureCheckpoint)
      const destinationCode = getCheckpointRouteCode(destinationCheckpoint)
      const flightNumber = resolveFreightManifestFlightNumber(
        data.shipmentDate,
        departureCode,
        destinationCode,
        data.flightNumber,
      )

      const blob = await generateFreightManifestPdf({
        departureLabel: getCheckpointManifestName(departureCheckpoint),
        destinationLabel: getCheckpointManifestName(destinationCheckpoint),
        departureCode,
        destinationCode,
        shipmentDate: data.shipmentDate,
        flightNumber,
        shipments,
      })

      const nextFileName = buildFreightManifestFileName({
        departureCode,
        destinationCode,
        shipmentDate: data.shipmentDate,
      })

      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(blob)
      })
      setPdfBlob(blob)
      setShipmentCount(shipments.length)
      setFileName(nextFileName)
      toast.success(`Manifeste généré (${shipments.length} expédition${shipments.length !== 1 ? 's' : ''})`)
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de générer le manifeste fret')
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
      title="Manifeste fret"
      description="Générez le PDF paysage à partir du trajet et de la date d'expédition."
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
                  label="Lieu de chargement"
                  value={departure}
                  onChange={(iri) => setValue('departure', iri, { shouldValidate: true })}
                  error={errors.departure?.message}
                  placeholder="Choisir le lieu de chargement..."
                  variant="filter"
                />
                <CheckpointAsyncSelect
                  label="Lieu de déchargement"
                  value={destination}
                  onChange={(iri) => setValue('destination', iri, { shouldValidate: true })}
                  error={errors.destination?.message}
                  placeholder="Choisir le lieu de déchargement..."
                  variant="filter"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
                Expédition
              </p>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Date d'expédition"
                  type="date"
                  className={fieldClass}
                  error={errors.shipmentDate?.message}
                  {...register('shipmentDate')}
                />
                <Input
                  label="N° du vol (optionnel)"
                  placeholder="Généré automatiquement si vide"
                  className={fieldClass}
                  error={errors.flightNumber?.message}
                  {...register('flightNumber')}
                />
              </div>
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
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(shipmentDate)}</p>
              </div>
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

            {!canGenerate && (
              <p className="text-xs text-muted-foreground">
                Renseignez le chargement, le déchargement et la date d&apos;expédition pour activer la génération.
              </p>
            )}
          </div>

          {previewUrl ? (
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/20">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                  Aperçu du manifeste fret
                </div>
                <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange">
                  {shipmentCount} expédition{shipmentCount !== 1 ? 's' : ''}
                </span>
              </div>
              <iframe
                title="Aperçu manifeste fret"
                src={previewUrl}
                className="h-[min(82vh,860px)] w-full bg-white"
              />
            </div>
          ) : (
            <div className="hidden rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-10 text-center lg:flex lg:min-h-[320px] lg:flex-col lg:items-center lg:justify-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-medium text-muted-foreground">Aperçu du PDF</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground/80">
                Le manifeste paysage s&apos;affichera ici après génération.
              </p>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
