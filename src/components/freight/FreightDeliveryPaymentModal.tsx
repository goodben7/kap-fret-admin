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
import { CURRENCY_LABELS } from '@/constants/ticket'
import { FREIGHT_PAYMENT_MODE_LABELS } from '@/constants/freight'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { usePreviewConversion } from '@/hooks/usePreviewConversion'
import { getCashRegisterCurrencyCode } from '@/lib/cash-register'
import { resolveCurrencyIriByCode } from '@/lib/currency-resource'
import { extractIri } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import {
  buildFreightDeliveryPaymentDescription,
  getFreightCurrency,
  getFreightDeliveryPaymentAmount,
} from '@/lib/freight'
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
  transaction: CashTransactionCreatePayload
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

  const currency = getFreightCurrency(shipment)
  const amount = getFreightDeliveryPaymentAmount(shipment)
  const defaultDescription = buildFreightDeliveryPaymentDescription(shipment)
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
  } = useForm<FreightDeliveryPaymentFormData>({
    resolver: zodResolver(freightDeliveryPaymentSchema),
    defaultValues: {
      cashRegister: '',
      amount,
      description: defaultDescription,
    },
  })

  const cashRegister = watch('cashRegister')

  useEffect(() => {
    if (!open) return
    reset({
      cashRegister: '',
      amount,
      description: defaultDescription,
    })
  }, [open, amount, defaultDescription, reset])

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
    if (!currencyIri) return
    await onConfirm({
      transaction: {
        cashRegister: data.cashRegister,
        type: CASH_TRANSACTION_TYPE.ENTRY,
        amount: data.amount,
        currency: currencyIri,
        description: data.description.trim(),
        referenceType: CASH_TRANSACTION_REFERENCE_TYPE.FREIGHT,
        referenceId: shipment.id,
        transactionDate: toTransactionDateIso(getTodayTravelDateInput(), getCurrentTravelTimeInput()),
        validated: true,
      },
    })
  })

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
                {formatMoney(parseFloat(amount) || 0, currency)}
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
                Encaisser et livrer
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
