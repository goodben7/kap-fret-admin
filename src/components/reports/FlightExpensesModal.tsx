import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Download, FileText, LoaderIcon, Plane } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegister, useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useIssuingOffice } from '@/hooks/useIssuingOffices'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { extractResourceId, toIri } from '@/lib/hydra'
import { getCheckpointIri } from '@/services/issuing-office.service'
import { formatCashRegisterSelectLabel } from '@/lib/cash-register'
import { formatFreightCheckpointLabel } from '@/lib/freight'
import { getUpcomingFlightTravelDateInput } from '@/lib/ticket'
import { formatDate, cn } from '@/lib/utils'
import {
  downloadBlob,
  generateCashRegisterReportPdf,
} from '@/lib/cash-register-report-pdf'
import { cashTransactionService } from '@/services/cash-transaction.service'
import { isAxiosError } from 'axios'
import { extractApiErrorMessage } from '@/services/api'
import { toast } from 'sonner'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const schema = z.object({
  cashRegister: z.string().min(1, 'Caisse requise'),
  departure: z.string().min(1, 'Chargement requis'),
  destination: z.string().min(1, 'Déchargement requis'),
  flightDate: z.string().min(1, 'Date du vol requise'),
  flightNumber: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface FlightExpensesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FlightExpensesModal({ open, onOpenChange }: FlightExpensesModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [transactionCount, setTransactionCount] = useState(0)
  const [fileName, setFileName] = useState('FORMULAIRE_DEPENSES.pdf')
  const departurePrefillDone = useRef(false)

  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const issuingOfficeId = extractResourceId(issuingOfficeIri) ?? ''
  const { data: issuingOffice } = useIssuingOffice(issuingOfficeId)
  const userCheckpointIri = useMemo(
    () => (issuingOffice ? getCheckpointIri(issuingOffice) : ''),
    [issuingOffice],
  )
  const locationLabel = issuingOffice?.name?.trim() || 'KINSHASA'

  const { data: cashRegisters = [], isLoading: cashRegistersLoading } = useCashRegistersForSelect(
    issuingOfficeIri,
  )

  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cashRegister: '',
      departure: '',
      destination: '',
      flightDate: getUpcomingFlightTravelDateInput(),
      flightNumber: '',
    },
  })

  const cashRegisterIri = watch('cashRegister')
  const departure = watch('departure')
  const destination = watch('destination')
  const flightDate = watch('flightDate')
  const registerId = extractResourceId(cashRegisterIri) ?? ''
  const { data: cashRegister } = useCashRegister(registerId)

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((item) => ({
        value: item['@id'] ?? toIri('cash_registers', item.id),
        label: formatCashRegisterSelectLabel(item),
      })),
    [cashRegisters],
  )

  useEffect(() => {
    if (!open) {
      departurePrefillDone.current = false
      return
    }
    reset({
      cashRegister: '',
      departure: '',
      destination: '',
      flightDate: getUpcomingFlightTravelDateInput(),
      flightNumber: '',
    })
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setPdfBlob(null)
    setTransactionCount(0)
  }, [open, reset])

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

  const generate = handleSubmit(async (data) => {
    if (!cashRegister) {
      toast.error('Caisse introuvable')
      return
    }
    setIsGenerating(true)
    try {
      const dateRange = { startDate: data.flightDate, endDate: data.flightDate }
      const transactions = await cashTransactionService.getAllForReport({
        cashRegister: data.cashRegister,
      })
      const routeLabel = `${formatFreightCheckpointLabel(data.departure)} – ${formatFreightCheckpointLabel(data.destination)}`

      const blob = await generateCashRegisterReportPdf({
        register: cashRegister,
        transactions,
        reportDate: data.flightDate,
        dateRange,
        locationLabel,
        variant: 'flight-expenses',
        flight: {
          flightDate: data.flightDate,
          flightNumber: data.flightNumber,
          routeLabel,
        },
      })

      const periodCount = transactions.filter((transaction) => {
        const date = transaction.transactionDate.split('T')[0] ?? transaction.transactionDate
        return date === data.flightDate
      }).length

      const nextFileName = `DEPENSES_${(data.flightNumber || 'VOL').replace(/\s+/g, '_')}_${data.flightDate.replace(/-/g, '')}.pdf`

      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(blob)
      })
      setPdfBlob(blob)
      setTransactionCount(periodCount)
      setFileName(nextFileName)

      if (periodCount === 0) {
        toast.message('Aperçu généré — aucune transaction ce jour sur cette caisse')
      } else {
        toast.success(`Aperçu généré (${periodCount} transaction${periodCount !== 1 ? 's' : ''})`)
      }
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de générer le formulaire de dépenses')
      }
    } finally {
      setIsGenerating(false)
    }
  })

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Formulaire de dépenses vol"
      description="Entrées / sorties USD·CDF pour un vol (même structure que le rapport caisse)."
      className="rounded-2xl sm:max-w-3xl"
    >
      <form onSubmit={(e) => void generate(e)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Caisse"
            placeholder={cashRegistersLoading ? 'Chargement...' : 'Sélectionner...'}
            options={cashRegisterOptions}
            error={errors.cashRegister?.message}
            disabled={cashRegistersLoading || isGenerating}
            variant="filter"
            value={cashRegisterIri ?? ''}
            onChange={(e) => setValue('cashRegister', e.target.value, { shouldValidate: true })}
          />
          <Input
            label="Date du vol"
            type="date"
            className={fieldClass}
            error={errors.flightDate?.message}
            disabled={isGenerating}
            {...registerField('flightDate')}
          />
          <CheckpointAsyncSelect
            label="Chargement"
            value={departure}
            initialCheckpointIri={userCheckpointIri || undefined}
            onChange={(iri) => setValue('departure', iri, { shouldValidate: true })}
            error={errors.departure?.message}
            disabled={isGenerating}
          />
          <CheckpointAsyncSelect
            label="Déchargement"
            value={destination}
            onChange={(iri) => setValue('destination', iri, { shouldValidate: true })}
            error={errors.destination?.message}
            disabled={isGenerating}
          />
          <Input
            label="N° du vol (optionnel)"
            className={fieldClass}
            disabled={isGenerating}
            {...registerField('flightNumber')}
          />
        </div>

        {flightDate && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            Mouvements du {formatDate(flightDate)} sur la caisse sélectionnée
            {transactionCount > 0 ? ` · ${transactionCount} ligne(s)` : null}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11 rounded-xl" disabled={isGenerating || !cashRegister}>
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
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            disabled={!pdfBlob}
            onClick={() => {
              if (pdfBlob) downloadBlob(pdfBlob, fileName)
            }}
          >
            <Download className="h-4 w-4" />
            Télécharger
          </Button>
        </div>

        {previewUrl ? (
          <iframe
            title="Aperçu formulaire de dépenses"
            src={previewUrl}
            className={cn('h-[55vh] w-full rounded-xl border border-border/60 bg-muted/10')}
          />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
            <Plane className="mr-2 h-4 w-4" />
            L&apos;aperçu PDF s&apos;affichera ici
          </div>
        )}
      </form>
    </Modal>
  )
}
