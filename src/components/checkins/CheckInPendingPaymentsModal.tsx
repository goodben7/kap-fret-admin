import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Download, LoaderIcon, MapPin, Scale } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import {
  checkInManifestSchema,
  type CheckInManifestFormData,
} from '@/schemas/check-in-manifest.schema'
import { useAuth } from '@/hooks/useAuth'
import { useIssuingOffice } from '@/hooks/useIssuingOffices'
import { checkpointService } from '@/services/checkpoint.service'
import { extractResourceId } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { getCheckpointIri } from '@/services/issuing-office.service'
import { isAxiosError } from 'axios'
import { extractApiErrorMessage } from '@/services/api'
import { getUpcomingFlightTravelDateInput } from '@/lib/ticket'
import { formatDate, cn } from '@/lib/utils'
import {
  getCheckpointManifestName,
  getCheckpointRouteCode,
} from '@/lib/passenger-manifest-pdf'
import {
  buildCheckInPendingPaymentsFileName,
  downloadBlob,
  fetchCheckInsForManifest,
  filterCheckInsWithPendingPayment,
  generateCheckInPendingPaymentsPdf,
} from '@/lib/check-in-pending-payments-pdf'
import { toast } from 'sonner'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface CheckInPendingPaymentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CheckInPendingPaymentsModal({
  open,
  onOpenChange,
}: CheckInPendingPaymentsModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [fileName, setFileName] = useState('SOLDES_BAGAGES.pdf')
  const [departureLabel, setDepartureLabel] = useState('')
  const [destinationLabel, setDestinationLabel] = useState('')
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
  } = useForm<CheckInManifestFormData>({
    resolver: zodResolver(checkInManifestSchema),
    defaultValues: {
      departure: '',
      destination: '',
      travelDate: getUpcomingFlightTravelDateInput(),
      flightNumber: '',
    },
  })

  const departure = watch('departure')
  const destination = watch('destination')
  const travelDate = watch('travelDate')

  useEffect(() => {
    if (!open) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return null
      })
      setPdfBlob(null)
      setPendingCount(0)
      departurePrefillDone.current = false
      reset({
        departure: '',
        destination: '',
        travelDate: getUpcomingFlightTravelDateInput(),
        flightNumber: '',
      })
      return
    }
    if (userCheckpointIri && !departurePrefillDone.current) {
      setValue('departure', userCheckpointIri, { shouldValidate: true })
      departurePrefillDone.current = true
    }
  }, [open, reset, setValue, userCheckpointIri])

  const resolveCheckpoint = useCallback(async (iri: string) => {
    const id = extractResourceId(iri)
    if (!id) throw new Error('Checkpoint invalide')
    return checkpointService.getById(id)
  }, [])

  useEffect(() => {
    if (!departure?.trim()) {
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
    if (!destination?.trim()) {
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

  const canGenerate = !!departure?.trim() && !!destination?.trim() && !!travelDate?.trim()
  const hasRouteSummary = !!departureLabel && !!destinationLabel && !!travelDate

  const generate = handleSubmit(async (data) => {
    setIsGenerating(true)
    try {
      const [departureCheckpoint, destinationCheckpoint] = await Promise.all([
        resolveCheckpoint(data.departure),
        resolveCheckpoint(data.destination),
      ])

      const checkIns = await fetchCheckInsForManifest(
        data.departure,
        data.destination,
        data.travelDate,
      )
      const pending = filterCheckInsWithPendingPayment(checkIns)

      if (pending.length === 0) {
        toast.error('Aucun solde bagages ouvert pour ce trajet et cette date')
        return
      }

      const departureCode = getCheckpointRouteCode(departureCheckpoint)
      const destinationCode = getCheckpointRouteCode(destinationCheckpoint)

      const blob = await generateCheckInPendingPaymentsPdf({
        departureLabel: getCheckpointManifestName(departureCheckpoint),
        destinationLabel: getCheckpointManifestName(destinationCheckpoint),
        departureCode,
        destinationCode,
        travelDate: data.travelDate,
        checkIns,
      })

      const nextFileName = buildCheckInPendingPaymentsFileName({
        departureCode,
        destinationCode,
        travelDate: data.travelDate,
      })

      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(blob)
      })
      setPdfBlob(blob)
      setPendingCount(pending.length)
      setFileName(nextFileName)
      toast.success(
        `Rapport généré (${pending.length} solde${pending.length !== 1 ? 's' : ''})`,
      )
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de générer le rapport soldes bagages')
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
      title="Soldes bagages en attente"
      description="PDF des check-ins avec reste à payer (ACC / PTA) pour un vol."
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
                <Input
                  label="Date de vol"
                  type="date"
                  className={fieldClass}
                  error={errors.travelDate?.message}
                  {...register('travelDate')}
                />
              </div>
            </div>

            {hasRouteSummary && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                {departureLabel} → {destinationLabel} · {formatDate(travelDate)}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="h-11 flex-1 rounded-xl"
                disabled={!canGenerate || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <LoaderIcon />
                    Génération...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4" />
                    Générer
                  </>
                )}
              </Button>
              {pdfBlob && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              )}
            </div>

            {pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingCount} solde{pendingCount !== 1 ? 's' : ''} ouvert
                {pendingCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {previewUrl && (
            <iframe
              title="Aperçu soldes bagages"
              src={previewUrl}
              className="min-h-[28rem] w-full rounded-xl border border-border/60 bg-muted/10"
            />
          )}
        </div>
      </form>
    </Modal>
  )
}
