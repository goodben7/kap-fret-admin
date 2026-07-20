import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Download, FileText, LoaderIcon, Wallet } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  cashRegisterReportSchema,
  type CashRegisterReportFormData,
} from '@/schemas/cash-register-report.schema'
import { getTodayTravelDateInput } from '@/lib/ticket'
import { formatDate, cn } from '@/lib/utils'
import {
  buildCashRegisterReportFileName,
  downloadBlob,
  generateCashRegisterReportPdf,
} from '@/lib/cash-register-report-pdf'
import { cashTransactionService } from '@/services/cash-transaction.service'
import { toIri } from '@/lib/hydra'
import { isAxiosError } from 'axios'
import { extractApiErrorMessage } from '@/services/api'
import { toast } from 'sonner'
import type { CashRegisterResource } from '@/types/cash-register'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

function getStartOfMonthInput(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

interface CashRegisterReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  register: CashRegisterResource
}

export function CashRegisterReportModal({
  open,
  onOpenChange,
  register,
}: CashRegisterReportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [transactionCount, setTransactionCount] = useState(0)
  const [fileName, setFileName] = useState('RAPPORT_MOUVEMENTS_FINANCIERS.pdf')

  const {
    register: registerField,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CashRegisterReportFormData>({
    resolver: zodResolver(cashRegisterReportSchema),
    defaultValues: {
      startDate: getStartOfMonthInput(),
      endDate: getTodayTravelDateInput(),
    },
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const canGenerate = !!startDate?.trim() && !!endDate?.trim()
  const hasPeriodSummary = !!startDate && !!endDate && startDate <= endDate

  useEffect(() => {
    if (!open) return
    reset({
      startDate: getStartOfMonthInput(),
      endDate: getTodayTravelDateInput(),
    })
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setPdfBlob(null)
    setTransactionCount(0)
    setFileName(buildCashRegisterReportFileName(register, {
      startDate: getStartOfMonthInput(),
      endDate: getTodayTravelDateInput(),
    }))
  }, [open, register, reset])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const generate = handleSubmit(async (data) => {
    setIsGenerating(true)
    try {
      const dateRange = { startDate: data.startDate, endDate: data.endDate }
      const reportDate = getTodayTravelDateInput()
      const cashRegisterIri = toIri('cash_registers', register.id)
      const transactions = await cashTransactionService.getAllForReport({ cashRegister: cashRegisterIri })

      const blob = await generateCashRegisterReportPdf({
        register,
        transactions,
        reportDate,
        dateRange,
      })

      const nextFileName = buildCashRegisterReportFileName(register, dateRange)
      const periodCount = transactions.filter((transaction) => {
        const date = transaction.transactionDate.split('T')[0] ?? transaction.transactionDate
        return date >= data.startDate && date <= data.endDate
      }).length

      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(blob)
      })
      setPdfBlob(blob)
      setTransactionCount(periodCount)
      setFileName(nextFileName)

      if (periodCount === 0) {
        toast.message('Aperçu généré — aucune transaction sur cette période')
      } else {
        toast.success(`Aperçu généré (${periodCount} transaction${periodCount !== 1 ? 's' : ''})`)
      }
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de générer le rapport de mouvements financiers')
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
      title="Rapport de mouvements financiers"
      description="Choisissez la période, générez l'aperçu puis téléchargez le PDF."
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
                <Wallet className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
                Registre
              </p>
              <div className="space-y-1">
                <p className="font-semibold">{register.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{register.code}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
                Période
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Date de début"
                  type="date"
                  className={fieldClass}
                  error={errors.startDate?.message}
                  {...registerField('startDate')}
                />
                <Input
                  label="Date de fin"
                  type="date"
                  className={fieldClass}
                  error={errors.endDate?.message}
                  {...registerField('endDate')}
                />
              </div>
            </div>

            {hasPeriodSummary && (
              <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Récapitulatif
                </p>
                <p className="mt-2 text-sm font-medium">
                  {formatDate(startDate)} → {formatDate(endDate)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le solde d&apos;ouverture inclut le solde initial du registre et les transactions antérieures à la date de début.
                </p>
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
                Renseignez la date de début et la date de fin pour activer la génération.
              </p>
            )}
          </div>

          {previewUrl ? (
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/20">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                  Aperçu du rapport de mouvements financiers
                </div>
                <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange">
                  {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
                </span>
              </div>
              <iframe
                title="Aperçu rapport mouvements financiers"
                src={previewUrl}
                className="h-[min(82vh,860px)] w-full bg-white"
              />
            </div>
          ) : (
            <div className="hidden rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-10 text-center lg:flex lg:min-h-[320px] lg:flex-col lg:items-center lg:justify-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-medium text-muted-foreground">Aperçu du PDF</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground/80">
                Le rapport paysage s&apos;affichera ici après génération.
              </p>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
