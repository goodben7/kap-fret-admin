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
import { CURRENCY, CURRENCY_OPTIONS } from '@/constants/ticket'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePreviewConversion } from '@/hooks/usePreviewConversion'
import { formatCashRegisterSelectLabel } from '@/lib/cash-register'
import { resolveCurrencyIriByCode } from '@/lib/currency-resource'
import { extractIri } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { buildTicketPaymentDescription, computeTicketPaymentAmount, getTicketPaymentAmount } from '@/lib/ticket'
import { formatMoney } from '@/lib/utils'
import type { Ticket } from '@/types/ticket'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

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
  const { data: exchangeRatesData } = useExchangeRates({ pagination: false })
  const exchangeRates = exchangeRatesData?.items ?? []

  const amount = getTicketPaymentAmount(ticket)
  const defaultDescription = buildTicketPaymentDescription(ticket)
  const usdCurrencyIri = resolveCurrencyIriByCode(currencies, CURRENCY.USD) ?? ''

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
      paymentCurrency: ticket.paymentCurrency ?? CURRENCY.USD,
      description: defaultDescription,
    },
  })

  const cashRegister = watch('cashRegister')
  const paymentCurrency = watch('paymentCurrency')
  const paymentCurrencyIri = resolveCurrencyIriByCode(currencies, paymentCurrency ?? CURRENCY.USD) ?? ''
  const fallbackPaymentAmount = (() => {
    const converted = computeTicketPaymentAmount(parseFloat(amount) || 0, paymentCurrency ?? CURRENCY.USD, exchangeRates)
    return converted != null ? parseFloat(converted) : undefined
  })()

  useEffect(() => {
    if (!open) return
    reset({
      cashRegister: '',
      paymentCurrency: ticket.paymentCurrency ?? CURRENCY.USD,
      description: defaultDescription,
    })
  }, [open, defaultDescription, reset, ticket.paymentCurrency])

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((register) => ({
        value: extractIri(register) ?? register['@id'],
        label: formatCashRegisterSelectLabel(register),
      })),
    [cashRegisters],
  )

  const previewEnabled =
    !!cashRegister
    && !!usdCurrencyIri
    && !!paymentCurrencyIri
    && (parseFloat(amount) || 0) > 0
  const {
    data: conversionPreview,
    isLoading: conversionPreviewLoading,
    isError: conversionPreviewError,
  } = usePreviewConversion({
    cashRegister: cashRegister || undefined,
    amount,
    currencyIri: usdCurrencyIri,
    paymentCurrencyIri: paymentCurrency !== CURRENCY.USD ? paymentCurrencyIri : undefined,
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
      description="Sélectionnez la caisse et la devise de paiement pour finaliser l'encaissement."
      className="rounded-2xl sm:max-w-lg"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-orange/25 bg-brand-orange/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Montant billet (USD)</p>
            <p className="truncate font-mono text-sm text-muted-foreground">{ticket.ticketNumber}</p>
          </div>
          <p className="shrink-0 text-lg font-bold tabular-nums text-brand-orange">
            {formatMoney(parseFloat(amount) || 0, CURRENCY.USD)}
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

        <Select
          label="Devise de paiement"
          options={CURRENCY_OPTIONS}
          error={errors.paymentCurrency?.message}
          disabled={isLoading}
          variant="filter"
          value={paymentCurrency ?? CURRENCY.USD}
          onChange={(e) =>
            setValue('paymentCurrency', e.target.value as TicketPaymentFormData['paymentCurrency'], {
              shouldValidate: true,
            })
          }
        />

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
            referenceAmount={parseFloat(amount) || 0}
            referenceCurrency={CURRENCY.USD}
            paymentCurrency={paymentCurrency}
            fallbackPaymentAmount={fallbackPaymentAmount}
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
          <Button
            type="submit"
            className="h-11 flex-1 rounded-xl"
            disabled={isLoading || !usdCurrencyIri || !paymentCurrencyIri}
          >
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
