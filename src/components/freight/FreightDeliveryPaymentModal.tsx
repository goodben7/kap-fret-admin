import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Banknote, Package } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { ConversionPreviewCard } from '@/components/tickets/ConversionPreviewCard'
import {
  freightDeliveryPaymentSchema,
  type FreightDeliveryPaymentFormData,
} from '@/schemas/freight-delivery-payment.schema'
import { CURRENCY, CURRENCY_LABELS } from '@/constants/ticket'
import { FREIGHT_PAYMENT_MODE_LABELS } from '@/constants/freight'
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
  buildFreightDeliveryPaymentDescription,
  getFreightCurrency,
  getFreightDeliveryPaymentAmount,
} from '@/lib/freight'
import {
  computeMixedPaymentEquivalentInCurrency,
  isMixedPaymentWithinTolerance,
  splitMixedPaymentLedgerAmounts,
  suggestMixedPaymentCdf,
} from '@/lib/mixed-payment'
import { getCurrentTravelTimeInput, getTodayTravelDateInput } from '@/lib/ticket'
import { formatMoney } from '@/lib/utils'
import type { FreightShipment } from '@/types/freight-shipment'
import type { CashTransactionCreatePayload } from '@/types/cash-transaction'
import { CASH_TRANSACTION_REFERENCE_TYPE, CASH_TRANSACTION_TYPE } from '@/constants/cash-transaction'
import { toTransactionDateIso } from '@/lib/cash-transaction'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const lockedFieldClass = `${fieldClass} cursor-not-allowed bg-muted/60`

export interface FreightDeliveryPaymentResult {
  transactions: CashTransactionCreatePayload[]
}

interface FreightDeliveryPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: FreightShipment
  onConfirm: (result: FreightDeliveryPaymentResult) => Promise<void>
  isLoading?: boolean
}

export function FreightDeliveryPaymentModal({
  open,
  onOpenChange,
  shipment,
  onConfirm,
  isLoading,
}: FreightDeliveryPaymentModalProps) {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: cashRegistersLoading } = useCashRegistersForSelect(
    issuingOfficeIri,
  )
  const { data: currencies = [] } = useCurrenciesForSelect()
  const { data: exchangeRatesData } = useExchangeRates({ pagination: false })
  const exchangeRates = exchangeRatesData?.items ?? []

  const currency = getFreightCurrency(shipment)
  const amount = getFreightDeliveryPaymentAmount(shipment)
  const amountNumber = parseFloat(amount) || 0
  const defaultDescription = buildFreightDeliveryPaymentDescription(shipment)
  const currencyIri = resolveCurrencyIriByCode(currencies, currency) ?? ''
  const usdCurrencyIri = resolveCurrencyIriByCode(currencies, CURRENCY.USD) ?? ''
  const cdfCurrencyIri = resolveCurrencyIriByCode(currencies, CURRENCY.CDF) ?? ''

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FreightDeliveryPaymentFormData>({
    resolver: zodResolver(freightDeliveryPaymentSchema),
    defaultValues: {
      cashRegister: '',
      amount,
      description: defaultDescription,
      mixedPayment: false,
      paidAmountUsd: '',
      paidAmountCdf: '',
    },
  })

  const cashRegister = watch('cashRegister')
  const mixedPayment = watch('mixedPayment')
  const paidAmountUsd = watch('paidAmountUsd')
  const paidAmountCdf = watch('paidAmountCdf')

  useEffect(() => {
    if (!open) return
    reset({
      cashRegister: '',
      amount,
      description: defaultDescription,
      mixedPayment: false,
      paidAmountUsd: '',
      paidAmountCdf: '',
    })
  }, [open, amount, defaultDescription, reset])

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((register) => ({
        value: extractIri(register) ?? register['@id'],
        label: formatCashRegisterSelectLabel(register),
      })),
    [cashRegisters],
  )

  const mixedEquivalent = useMemo(() => {
    if (!mixedPayment) return null
    return computeMixedPaymentEquivalentInCurrency(
      paidAmountUsd ?? '',
      paidAmountCdf ?? '',
      currency,
      exchangeRates,
    )
  }, [mixedPayment, paidAmountUsd, paidAmountCdf, currency, exchangeRates])

  const mixedPaymentOk =
    !!mixedPayment
    && amountNumber > 0
    && isMixedPaymentWithinTolerance(
      amountNumber,
      paidAmountUsd ?? '',
      paidAmountCdf ?? '',
      exchangeRates,
      0.05,
      currency,
    )

  const previewEnabled = !mixedPayment && !!cashRegister && !!currencyIri && amountNumber > 0
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
    if (!currencyIri) return
    const transactionDate = toTransactionDateIso(
      getTodayTravelDateInput(),
      getCurrentTravelTimeInput(),
    )

    if (data.mixedPayment) {
      if (!usdCurrencyIri || !cdfCurrencyIri) return
      const split = splitMixedPaymentLedgerAmounts(
        amountNumber,
        data.paidAmountUsd ?? '',
        data.paidAmountCdf ?? '',
        currency,
        exchangeRates,
      )
      if (!split) return

      await onConfirm({
        transactions: [
          {
            cashRegister: data.cashRegister,
            type: CASH_TRANSACTION_TYPE.ENTRY,
            amount: split.usdLegAmount,
            currency: currencyIri,
            paymentCurrency: usdCurrencyIri,
            description: `${data.description.trim()} (USD)`,
            referenceType: CASH_TRANSACTION_REFERENCE_TYPE.FREIGHT,
            referenceId: shipment.id,
            transactionDate,
            validated: true,
          },
          {
            cashRegister: data.cashRegister,
            type: CASH_TRANSACTION_TYPE.ENTRY,
            amount: split.cdfLegAmount,
            currency: currencyIri,
            paymentCurrency: cdfCurrencyIri,
            description: `${data.description.trim()} (CDF)`,
            referenceType: CASH_TRANSACTION_REFERENCE_TYPE.FREIGHT,
            referenceId: shipment.id,
            transactionDate,
            validated: true,
          },
        ],
      })
      return
    }

    await onConfirm({
      transactions: [
        {
          cashRegister: data.cashRegister,
          type: CASH_TRANSACTION_TYPE.ENTRY,
          amount: data.amount,
          currency: currencyIri,
          description: data.description.trim(),
          referenceType: CASH_TRANSACTION_REFERENCE_TYPE.FREIGHT,
          referenceId: shipment.id,
          transactionDate,
          validated: true,
        },
      ],
    })
  })

  const canSubmit = mixedPayment
    ? mixedPaymentOk && !!currencyIri && !!usdCurrencyIri && !!cdfCurrencyIri
    : !!currencyIri

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Encaissement — solde à la livraison"
      description="Encaissez le reste à payer avant de marquer l'expédition comme livrée."
      className="rounded-2xl sm:max-w-lg"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="space-y-3 rounded-xl border border-brand-orange/25 bg-brand-orange/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-brand-orange" aria-hidden="true" />
            {shipment.ltaNumber}
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Mode de paiement</p>
              <p className="font-medium">{FREIGHT_PAYMENT_MODE_LABELS[shipment.paymentMode]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reste à payer</p>
              <p className="font-bold tabular-nums text-brand-orange">
                {formatMoney(amountNumber, currency)}
              </p>
            </div>
          </div>
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
              if (!checked) {
                setValue('paidAmountUsd', '', { shouldValidate: true })
                setValue('paidAmountCdf', '', { shouldValidate: true })
              }
            }}
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">Paiement mixte (USD + CDF)</span>
            <span className="block text-xs text-muted-foreground">
              Couvrir le solde avec une partie en dollars et une partie en francs.
            </span>
          </span>
        </label>

        {!mixedPayment && (
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
                const suggested = suggestMixedPaymentCdf(
                  amountNumber,
                  nextUsd,
                  exchangeRates,
                  currency,
                )
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
                <span className="text-muted-foreground">Équivalent total</span>
                <span className="font-semibold tabular-nums">
                  {mixedEquivalent != null ? formatMoney(mixedEquivalent, currency) : '—'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Reste à payer</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(amountNumber, currency)}
                </span>
              </div>
              {paidAmountUsd && paidAmountCdf && mixedEquivalent != null && !mixedPaymentOk && (
                <p className="mt-2 text-xs text-destructive">
                  L&apos;équivalent mixte doit correspondre au reste à payer.
                </p>
              )}
              {mixedPaymentOk && (
                <p className="mt-2 text-xs text-emerald-700">
                  Deux écritures caisse (USD + CDF) seront créées.
                </p>
              )}
            </div>
          </>
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
          <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={isLoading || !canSubmit}>
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                Encaisser et livrer
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
