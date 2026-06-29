import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Banknote, Luggage } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { ConversionPreviewCard } from '@/components/tickets/ConversionPreviewCard'
import {
  checkInBaggageTransactionSchema,
  type CheckInBaggageTransactionFormData,
} from '@/schemas/check-in-baggage-transaction.schema'
import { CURRENCY_LABELS } from '@/constants/ticket'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { usePreviewConversion } from '@/hooks/usePreviewConversion'
import { getCashRegisterCurrencyCode } from '@/lib/cash-register'
import { resolveCurrencyIriByCode } from '@/lib/currency-resource'
import { extractIri } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import {
  formatCheckInWeight,
  getBaggageTypeLabel,
  type CheckInAddedBaggagePaymentDelta,
} from '@/lib/check-in'
import { getCurrentTravelTimeInput, getTodayTravelDateInput } from '@/lib/ticket'
import { formatMoney } from '@/lib/utils'
import type { CheckIn } from '@/types/check-in'
import type { CashTransactionCreatePayload } from '@/types/cash-transaction'
import { CASH_TRANSACTION_REFERENCE_TYPE, CASH_TRANSACTION_TYPE } from '@/constants/cash-transaction'
import { toTransactionDateIso } from '@/lib/cash-transaction'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

export interface CheckInBaggageTransactionResult {
  transaction: CashTransactionCreatePayload
  paidAmount: string
}

interface CheckInBaggageTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checkIn: CheckIn
  delta: CheckInAddedBaggagePaymentDelta
  onConfirm: (result: CheckInBaggageTransactionResult) => Promise<void>
  isLoading?: boolean
}

export function CheckInBaggageTransactionModal({
  open,
  onOpenChange,
  checkIn,
  delta,
  onConfirm,
  isLoading,
}: CheckInBaggageTransactionModalProps) {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: cashRegistersLoading } = useCashRegistersForSelect(
    issuingOfficeIri,
  )
  const { data: currencies = [] } = useCurrenciesForSelect()

  const currencyIri = resolveCurrencyIriByCode(currencies, delta.currency) ?? ''
  const currencyCodeByIri = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of currencies) {
      const iri = extractIri(c) ?? c['@id']
      if (iri && c.code) map.set(iri, c.code)
    }
    return map
  }, [currencies])

  const defaultDescription = `Check-in ${checkIn.id} — ${
    delta.newBaggages.length > 1
      ? `${delta.newBaggages.length} bagages ajoutés`
      : '1 bagage ajouté'
  }`

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CheckInBaggageTransactionFormData>({
    resolver: zodResolver(checkInBaggageTransactionSchema),
    defaultValues: {
      cashRegister: '',
      amount: delta.deltaAmount,
      description: defaultDescription,
    },
  })

  const cashRegister = watch('cashRegister')
  const amount = watch('amount')

  useEffect(() => {
    if (!open) return
    reset({
      cashRegister: '',
      amount: delta.deltaAmount,
      description: defaultDescription,
    })
  }, [open, delta.deltaAmount, defaultDescription, reset])

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
    amount: amount ?? '0',
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
        referenceType: CASH_TRANSACTION_REFERENCE_TYPE.CHECKIN,
        referenceId: checkIn.id,
        transactionDate: toTransactionDateIso(getTodayTravelDateInput(), getCurrentTravelTimeInput()),
        validated: true,
      },
      paidAmount: data.amount,
    })
  })

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Encaissement — bagages ajoutés"
      description="Complétez la transaction caisse avant d'enregistrer la modification du check-in."
      className="rounded-2xl sm:max-w-lg"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="space-y-3 rounded-xl border border-brand-orange/25 bg-brand-orange/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Luggage className="h-4 w-4 text-brand-orange" aria-hidden="true" />
            Bagages ajoutés ({delta.newBaggages.length})
          </div>
          <ul className="space-y-2">
            {delta.newBaggages.map((baggage, index) => (
              <li
                key={`${baggage.baggageType}-${baggage.weight}-${index}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{getBaggageTypeLabel(baggage.baggageType)}</p>
                  {baggage.description?.trim() && (
                    <p className="text-muted-foreground">{baggage.description}</p>
                  )}
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCheckInWeight(baggage.weight ?? '0')}
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 border-t border-brand-orange/20 pt-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Excédent additionnel</p>
              <p className="font-semibold tabular-nums">{formatCheckInWeight(delta.deltaExcessWeightKg)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Montant à encaisser</p>
              <p className="font-bold tabular-nums text-brand-orange">
                {formatMoney(parseFloat(delta.deltaAmount) || 0, delta.currency)}
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
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className={fieldClass}
            error={errors.amount?.message}
            disabled={isLoading}
            {...register('amount')}
          />
          <Input
            label="Devise"
            value={CURRENCY_LABELS[delta.currency]}
            disabled
            readOnly
            className={fieldClass}
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
                Encaisser et enregistrer
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
