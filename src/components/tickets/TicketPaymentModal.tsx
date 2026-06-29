import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Banknote } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { ConversionPreviewCard } from '@/components/tickets/ConversionPreviewCard'
import { ticketPaymentSchema, type TicketPaymentFormData } from '@/schemas/ticket-payment.schema'
import { CURRENCY_LABELS, normalizeCurrency } from '@/constants/ticket'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { usePreviewConversion } from '@/hooks/usePreviewConversion'
import { getCashRegisterCurrencyCode } from '@/lib/cash-register'
import { resolveCurrencyIriByCode } from '@/lib/currency-resource'
import { extractIri } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { buildTicketPaymentDescription, getTicketPaymentAmount } from '@/lib/ticket'
import { formatMoney } from '@/lib/utils'
import type { Ticket } from '@/types/ticket'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const lockedFieldClass = `${fieldClass} cursor-not-allowed bg-muted/60`

interface TicketPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket
  onConfirm: (data: TicketPaymentFormData) => Promise<void>
  isLoading?: boolean
}

export function TicketPaymentModal({
  open,
  onOpenChange,
  ticket,
  onConfirm,
  isLoading,
}: TicketPaymentModalProps) {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: cashRegistersLoading } = useCashRegistersForSelect(
    issuingOfficeIri,
  )
  const { data: currencies = [] } = useCurrenciesForSelect()

  const currency = normalizeCurrency(ticket.currency)
  const amount = getTicketPaymentAmount(ticket)
  const defaultDescription = buildTicketPaymentDescription(ticket)
  const currencyIri = resolveCurrencyIriByCode(currencies, currency) ?? ''

  const currencyCodeByIri = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of currencies) {
      const iri = extractIri(c) ?? c['@id']
      if (iri && c.code) map.set(iri, c.code)
    }
    return map
  }, [currencies])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TicketPaymentFormData>({
    resolver: zodResolver(ticketPaymentSchema),
    defaultValues: {
      cashRegister: '',
      description: defaultDescription,
    },
  })

  const cashRegister = watch('cashRegister')

  useEffect(() => {
    if (!open) return
    reset({
      cashRegister: '',
      description: defaultDescription,
    })
  }, [open, defaultDescription, reset])

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((register) => {
        const code = getCashRegisterCurrencyCode(register.currency, currencyCodeByIri)
        const value = extractIri(register) ?? register['@id']
        return {
          value,
          label: code ? `${register.code} — ${register.name} (${code})` : `${register.code} — ${register.name}`,
        }
      }),
    [cashRegisters, currencyCodeByIri],
  )

  const previewEnabled = !!cashRegister && !!currencyIri && (parseFloat(amount) || 0) > 0
  const {
    data: conversionPreview,
    isLoading: conversionPreviewLoading,
    isError: conversionPreviewError,
  } = usePreviewConversion({
    cashRegister: cashRegister || undefined,
    amount,
    currencyIri,
    enabled: previewEnabled && open,
  })

  const handleOpenChange = (next: boolean) => {
    if (!next && !isLoading) onOpenChange(false)
  }

  const submit = handleSubmit(async (data) => {
    await onConfirm(data)
  })

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Encaissement du billet"
      description="Sélectionnez la caisse pour finaliser le paiement et émettre le billet."
      className="rounded-2xl sm:max-w-lg"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-orange/25 bg-brand-orange/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Montant à encaisser</p>
            <p className="truncate font-mono text-sm text-muted-foreground">{ticket.ticketNumber}</p>
          </div>
          <p className="shrink-0 text-lg font-bold tabular-nums text-brand-orange">
            {formatMoney(parseFloat(amount) || 0, currency)}
          </p>
        </div>

        <Select
          label="Caisse"
          placeholder={
            cashRegistersLoading
              ? 'Chargement des caisses...'
              : cashRegisterOptions.length
                ? 'Sélectionner une caisse'
                : 'Aucune caisse disponible'
          }
          options={cashRegisterOptions}
          error={errors.cashRegister?.message}
          disabled={isLoading || cashRegistersLoading || cashRegisterOptions.length === 0}
          variant="filter"
          value={cashRegister ?? ''}
          onChange={(e) => setValue('cashRegister', e.target.value, { shouldValidate: true })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Montant"
            value={amount}
            disabled
            readOnly
            className={lockedFieldClass}
          />
          <Input
            label="Devise"
            value={CURRENCY_LABELS[currency]}
            disabled
            readOnly
            className={lockedFieldClass}
          />
        </div>

        <Input
          label="Description"
          className={fieldClass}
          error={errors.description?.message}
          disabled={isLoading}
          {...register('description')}
        />

        {previewEnabled && (
          <ConversionPreviewCard
            preview={conversionPreview}
            isLoading={conversionPreviewLoading}
            isError={conversionPreviewError}
          />
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={isLoading || !currencyIri}>
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                Encaisser et émettre
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
