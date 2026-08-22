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
import {
  computeMixedPaymentUsdEquivalent,
  suggestMixedPaymentCdf,
} from '@/lib/mixed-payment'
import {
  buildTicketPaymentDescription,
  computeTicketPaymentAmount,
  getTicketPaidAmount,
  getTicketPaymentAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
} from '@/lib/ticket'
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

  const remainingAmount = getTicketPaymentAmount(ticket)
  const totalAmount = getTicketTotalAmount(ticket)
  const paidAmount = getTicketPaidAmount(ticket)
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
      amount: remainingAmount,
      cashRegister: '',
      paymentCurrency: ticket.paymentCurrency ?? CURRENCY.USD,
      mixedPayment: false,
      paidAmountUsd: '',
      paidAmountCdf: '',
      description: defaultDescription,
    },
  })

  const cashRegister = watch('cashRegister')
  const paymentCurrency = watch('paymentCurrency')
  const mixedPayment = watch('mixedPayment')
  const paidAmountUsd = watch('paidAmountUsd')
  const paidAmountCdf = watch('paidAmountCdf')
  const amount = watch('amount')
  const amountNumber = parseFloat(String(amount ?? '').replace(',', '.')) || 0
  const remaining = getTicketRemainingAmount(ticket)
  const paymentCurrencyIri = resolveCurrencyIriByCode(currencies, paymentCurrency ?? CURRENCY.USD) ?? ''

  const mixedUsdEquivalent = useMemo(() => {
    if (!mixedPayment) return null
    return computeMixedPaymentUsdEquivalent(paidAmountUsd ?? '', paidAmountCdf ?? '', exchangeRates)
  }, [mixedPayment, paidAmountUsd, paidAmountCdf, exchangeRates])

  const fallbackPaymentAmount = (() => {
    if (mixedPayment) return undefined
    const converted = computeTicketPaymentAmount(amountNumber, paymentCurrency ?? CURRENCY.USD, exchangeRates)
    return converted != null ? parseFloat(converted) : undefined
  })()

  useEffect(() => {
    if (!open) return
    reset({
      amount: getTicketPaymentAmount(ticket),
      cashRegister: '',
      paymentCurrency: ticket.paymentCurrency ?? CURRENCY.USD,
      mixedPayment: false,
      paidAmountUsd: '',
      paidAmountCdf: '',
      description: defaultDescription,
    })
  }, [open, defaultDescription, reset, ticket])

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((register) => ({
        value: extractIri(register) ?? register['@id'],
        label: formatCashRegisterSelectLabel(register),
      })),
    [cashRegisters],
  )

  const previewEnabled =
    !mixedPayment
    && !!cashRegister
    && !!usdCurrencyIri
    && !!paymentCurrencyIri
    && amountNumber > 0
  const {
    data: conversionPreview,
    isLoading: conversionPreviewLoading,
    isError: conversionPreviewError,
  } = usePreviewConversion({
    cashRegister: cashRegister || undefined,
    amount: String(amountNumber),
    currencyIri: usdCurrencyIri,
    paymentCurrencyIri: paymentCurrency !== CURRENCY.USD ? paymentCurrencyIri : undefined,
    enabled: previewEnabled && open,
  })

  const handleOpenChange = (next: boolean) => {
    if (!next && !isLoading) onOpenChange(false)
  }

  const submit = handleSubmit(async (data) => {
    if (data.mixedPayment) {
      const credit = computeMixedPaymentUsdEquivalent(
        data.paidAmountUsd ?? '',
        data.paidAmountCdf ?? '',
        exchangeRates,
      )
      if (credit == null || credit <= 0 || credit > remaining + 0.001) return
      await onConfirm(data)
      return
    }
    const paidNow = parseFloat(String(data.amount ?? '').replace(',', '.')) || 0
    if (paidNow > remaining + 0.001) {
      return
    }
    await onConfirm(data)
  })

  const amountTooHigh = !mixedPayment && amountNumber > remaining + 0.001
  const mixedTooHigh = mixedPayment && mixedUsdEquivalent != null && mixedUsdEquivalent > remaining + 0.001
  const mixedReady =
    mixedPayment
    && mixedUsdEquivalent != null
    && mixedUsdEquivalent > 0
    && !mixedTooHigh
  const canSubmit = mixedPayment
    ? mixedReady && !!usdCurrencyIri
    : !!usdCurrencyIri && !!paymentCurrencyIri && !amountTooHigh && amountNumber > 0

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Encaissement du billet"
      description="Saisissez un acompte ou le solde restant, puis choisissez la caisse."
      className="rounded-2xl sm:max-w-lg"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-brand-orange/25 bg-brand-orange/5 px-4 py-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(totalAmount, CURRENCY.USD)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Déjà payé</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(paidAmount, CURRENCY.USD)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Reste</p>
            <p className="mt-0.5 font-bold tabular-nums text-brand-orange">
              {formatMoney(remaining, CURRENCY.USD)}
            </p>
          </div>
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</p>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
            mixedPayment
              ? 'border-brand-orange/40 bg-brand-orange/5'
              : 'border-border/60 bg-muted/20'
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input"
            checked={!!mixedPayment}
            disabled={isLoading}
            onChange={(e) => {
              const checked = e.target.checked
              setValue('mixedPayment', checked, { shouldValidate: true })
              if (checked) {
                setValue('paymentCurrency', CURRENCY.USD, { shouldValidate: true })
                setValue('amount', remaining.toFixed(2), { shouldValidate: true })
                setValue('paidAmountUsd', '', { shouldValidate: true })
                setValue('paidAmountCdf', '', { shouldValidate: true })
              } else {
                setValue('paidAmountUsd', '', { shouldValidate: true })
                setValue('paidAmountCdf', '', { shouldValidate: true })
              }
            }}
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">Paiement mixte (USD + CDF)</span>
            <span className="block text-xs text-muted-foreground">
              Couvrir le reste avec une partie en dollars et une partie en francs.
            </span>
          </span>
        </label>

        {!mixedPayment && (
          <Input
            label="Montant à encaisser (USD)"
            inputMode="decimal"
            className={fieldClass}
            error={errors.amount?.message ?? (amountTooHigh ? 'Montant supérieur au reste à payer' : undefined)}
            disabled={isLoading}
            {...register('amount')}
          />
        )}

        {mixedPayment && (
          <>
            <Input
              label="Montant encaissé (USD)"
              inputMode="decimal"
              className={fieldClass}
              error={errors.paidAmountUsd?.message}
              disabled={isLoading}
              value={paidAmountUsd ?? ''}
              onChange={(e) => {
                const nextUsd = e.target.value
                setValue('paidAmountUsd', nextUsd, { shouldValidate: true })
                const suggested = suggestMixedPaymentCdf(remaining, nextUsd, exchangeRates)
                if (suggested != null) {
                  setValue('paidAmountCdf', suggested, { shouldValidate: true })
                }
              }}
            />
            <Input
              label="Montant encaissé (CDF)"
              inputMode="decimal"
              className={fieldClass}
              error={errors.paidAmountCdf?.message}
              disabled={isLoading}
              {...register('paidAmountCdf')}
            />
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Crédit billet (USD)</span>
                <span className="font-semibold tabular-nums">
                  {mixedUsdEquivalent != null
                    ? formatMoney(mixedUsdEquivalent, CURRENCY.USD)
                    : '—'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Reste à payer</span>
                <span className="font-semibold tabular-nums">{formatMoney(remaining, CURRENCY.USD)}</span>
              </div>
              {mixedTooHigh && (
                <p className="mt-2 text-xs text-destructive">Montant supérieur au reste à payer.</p>
              )}
              {mixedReady && (
                <p className="mt-2 text-xs text-emerald-700">
                  Deux écritures caisse (USD + CDF) seront créées pour ce crédit.
                </p>
              )}
            </div>
          </>
        )}

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

        {!mixedPayment && (
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
        )}

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
            referenceAmount={amountNumber}
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
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                Encaisser
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
