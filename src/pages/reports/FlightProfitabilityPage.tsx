import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Download,
  Loader2,
  Package,
  Plane,
  Scale,
  Ticket,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIssuingOffice } from '@/hooks/useIssuingOffices'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { extractResourceId } from '@/lib/hydra'
import { getCheckpointIri } from '@/services/issuing-office.service'
import { getUpcomingFlightTravelDateInput } from '@/lib/ticket'
import { formatDate, cn } from '@/lib/utils'
import {
  fetchFlightProfitabilityReport,
  formatMoneyByCurrency,
  type FlightProfitabilityReport,
  type FlightProfitabilitySection,
} from '@/lib/flight-profitability'
import {
  buildFlightProfitabilityFileName,
  downloadBlob,
  generateFlightProfitabilityPdf,
} from '@/lib/flight-profitability-pdf'
import { isAxiosError } from 'axios'
import { extractApiErrorMessage } from '@/services/api'
import { toast } from 'sonner'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const schema = z.object({
  departure: z.string().min(1, 'Chargement requis'),
  destination: z.string().min(1, 'Déchargement requis'),
  flightDate: z.string().min(1, 'Date du vol requise'),
  flightNumber: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function SectionCard({
  title,
  icon: Icon,
  section,
  hint,
  muted,
}: {
  title: string
  icon: typeof Ticket
  section: FlightProfitabilitySection
  hint?: string
  muted?: boolean
}) {
  return (
    <Card className={cn('rounded-2xl border-border/80 shadow-sm', muted && 'opacity-75')}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-brand-orange" />
          {title}
        </CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Nb</p>
          <p className="font-semibold tabular-nums">{section.count}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Poids</p>
          <p className="font-semibold tabular-nums">
            {section.weightKg > 0.001
              ? `${section.weightKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-semibold tabular-nums">{formatMoneyByCurrency(section.total)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Encaissé / Solde</p>
          <p className="font-semibold tabular-nums text-emerald-700">
            {formatMoneyByCurrency(section.paid)}
          </p>
          <p className="text-xs tabular-nums text-brand-orange">
            reste {formatMoneyByCurrency(section.remaining)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function FlightProfitabilityPage() {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const issuingOfficeId = extractResourceId(issuingOfficeIri) ?? ''
  const { data: issuingOffice } = useIssuingOffice(issuingOfficeId)
  const userCheckpointIri = useMemo(
    () => (issuingOffice ? getCheckpointIri(issuingOffice) : ''),
    [issuingOffice],
  )
  const departurePrefillDone = useRef(false)

  const [report, setReport] = useState<FlightProfitabilityReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      departure: '',
      destination: '',
      flightDate: getUpcomingFlightTravelDateInput(),
      flightNumber: '',
    },
  })

  const departure = watch('departure')
  const destination = watch('destination')

  useEffect(() => {
    if (departurePrefillDone.current || !userCheckpointIri) return
    if (departure) {
      departurePrefillDone.current = true
      return
    }
    setValue('departure', userCheckpointIri, { shouldValidate: true })
    departurePrefillDone.current = true
  }, [userCheckpointIri, departure, setValue])

  const onSearch = handleSubmit(async (data) => {
    setLoading(true)
    setReport(null)
    try {
      const next = await fetchFlightProfitabilityReport({
        flightDate: data.flightDate,
        departure: data.departure,
        destination: data.destination,
        flightNumber: data.flightNumber,
      })
      setReport(next)
      if (
        next.tickets.count === 0
        && next.freightShipped.count === 0
        && next.excessBaggage.count === 0
      ) {
        toast.message('Aucune donnée de rentabilité pour ce vol')
      }
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de calculer la rentabilité')
      }
    } finally {
      setLoading(false)
    }
  })

  const handlePdf = async () => {
    if (!report) return
    setPdfLoading(true)
    try {
      const blob = await generateFlightProfitabilityPdf(report)
      downloadBlob(blob, buildFlightProfitabilityFileName(report))
      toast.success('PDF téléchargé')
    } catch {
      toast.error('Impossible de générer le PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link to="/reports/flights" aria-label="Retour rapports vol">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Rentabilité vol</h1>
          <p className="text-sm text-muted-foreground">
            Billets + fret expédié + excédent bagages (séparés)
          </p>
        </div>
        {report && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={pdfLoading}
            onClick={() => void handlePdf()}
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </Button>
        )}
      </div>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <form onSubmit={(e) => void onSearch(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CheckpointAsyncSelect
                label="Départ"
                value={departure}
                initialCheckpointIri={userCheckpointIri || undefined}
                onChange={(iri) => setValue('departure', iri, { shouldValidate: true })}
                error={errors.departure?.message}
              />
              <CheckpointAsyncSelect
                label="Destination"
                value={destination}
                onChange={(iri) => setValue('destination', iri, { shouldValidate: true })}
                error={errors.destination?.message}
              />
              <Input
                label="Date du vol"
                type="date"
                className={fieldClass}
                error={errors.flightDate?.message}
                {...register('flightDate')}
              />
              <Input
                label="N° du vol (optionnel)"
                className={fieldClass}
                {...register('flightNumber')}
              />
            </div>
            <Button type="submit" className="h-11 rounded-xl" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calcul...
                </>
              ) : (
                <>
                  <Plane className="h-4 w-4" />
                  Calculer
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingSpinner label="Agrégation billets, fret et bagages..." />
      ) : !report ? (
        <EmptyState
          icon={Wallet}
          title="Choisir un vol"
          description="Indiquez date et trajet pour agréger la rentabilité."
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3 text-sm">
            <p className="font-semibold">{report.routeLabel}</p>
            <p className="text-muted-foreground">
              {formatDate(report.criteria.flightDate)}
              {report.criteria.flightNumber?.trim()
                ? ` · Vol ${report.criteria.flightNumber.trim()}`
                : ''}
            </p>
          </div>

          <SectionCard title="Billets passagers" icon={Ticket} section={report.tickets} />
          <SectionCard
            title="Fret expédié"
            icon={Package}
            section={report.freightShipped}
            hint="LTA SENT / ARRIVÉ / LIVRÉ uniquement"
          />
          <SectionCard
            title="Excédent bagages"
            icon={Scale}
            section={report.excessBaggage}
            hint="Check-in — distinct du fret"
          />
          <SectionCard
            title="Total rentabilité"
            icon={Wallet}
            section={report.combined}
          />
          <SectionCard
            title="Fret non expédié (PENDING)"
            icon={Package}
            section={report.freightPending}
            hint="Hors total rentabilité — pas encore embarqué"
            muted
          />
        </div>
      )}
    </div>
  )
}
