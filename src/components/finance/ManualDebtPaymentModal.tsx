import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Banknote } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { MixedExchangeRateField } from '@/components/payments/MixedExchangeRateField'
import {
  manualDebtPaymentSchema,
  type ManualDebtPaymentFormData,
} from '@/schemas/manual-debt.schema'
import { CURRENCY, CURRENCY_OPTIONS } from '@/constants/ticket'
import { MANUAL_DEBT_CURRENCY } from '@/constants/manual-debt'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCashRegisterSelectLabel } from '@/lib/cash-register'
import { getActiveUsdToCdfRate } from '@/lib/exchange-rate'
import { extractIri } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import {
  computeMixedPaymentUsdEquivalent,
  suggestMixedPaymentCdf,
} from '@/lib/mixed-payment'
import { getManualDebtRemaining } from '@/lib/manual-debt'
import { formatMoney } from '@/lib/utils'
import type { ManualDebt } from '@/types/manual-debt'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface ManualDebtPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debt: ManualDebt
  onConfirm: (data: ManualDebtPaymentFormData) => Promise<void>
  isLoading?: boolean
}

export function ManualDebtPaymentModal({
  open,
  onOpenChange,
  debt,
  onConfirm,
  isLoading,
}: ManualDebtPaymentModalProps) {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: cashRegistersLoading } = useCashRegistersForSelect(
    issuingOfficeIri,
  )
  const { data: exchangeRatesData } = useExchangeRates({ pagination: false })
  const exchangeRates = exchangeRatesData?.items ?? []

  const remaining = getManualDebtRemaining(debt)
  const total = parseFloat(debt.amount) || 0
  const paid = parseFloat(debt.paidAmount) || 0
  const debtCurrency = debt.currency || MANUAL_DEBT_CURRENCY.USD
  const canMix = debtCurrency === MANUAL_DEBT_CURRENCY.USD
  const defaultDescription = `Encaissement dette ${debt.id} — ${debt.debtorName}`

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ManualDebtPaymentFormData>({
    resolver: zodResolver(manualDebtPaymentSchema),
    defaultValues: {
      amount: remaining.toFixed(2),
      cashRegister: '',
      paymentCurrency: debtCurrency === MANUAL_DEBT_CURRENCY.CDF ? CURRENCY.CDF : CURRENCY.USD,
      mixedPayment: false,
      paidAmountUsd: '',
      paidAmountCdf: '',
      exchangeRate: '',
      description: defaultDescription,
    },
  })

  const cashRegister = watch('cashRegister')
  const paymentCurrency = watch('paymentCurrency')
  const mixedPayment = watch('mixedPayment')
  const paidAmountUsd = watch('paidAmountUsd')
  const paidAmountCdf = watch('paidAmountCdf')
  const exchangeRate = watch('exchangeRate')
  const amount = watch('amount')
  const amountNumber = parseFloat(String(amount ?? '').replace(',', '.')) || 0

  const adminUsdToCdfRate = useMemo(() => getActiveUsdToCdfRate(exchangeRates), [exchangeRates])

  useEffect(() => {
    if (!mixedPayment) return
    if ((exchangeRate ?? '').trim()) return
    if (adminUsdToCdfRate == null) return
    setValue('exchangeRate', adminUsdToCdfRate.toFixed(2), { shouldValidate: true })
  }, [mixedPayment, exchangeRate, adminUsdToCdfRate, setValue])

  const mixedUsdEquivalent = useMemo(() => {
    if (!mixedPayment) return null
    return computeMixedPaymentUsdEquivalent(
      paidAmountUsd ?? '',
      paidAmountCdf ?? '',
      exchangeRates,
      exchangeRate,
    )
  }, [mixedPayment, paidAmountUsd, paidAmountCdf, exchangeRates, exchangeRate])

  useEffect(() => {
    if (!open) return
    reset({
      amount: getManualDebtRemaining(debt).toFixed(2),
      cashRegister: '',
      paymentCurrency: debt.currency === MANUAL_DEBT_CURRENCY.CDF ? CURRENCY.CDF : CURRENCY.USD,
      mixedPayment: false,
      paidAmountUsd: '',
      paidAmountCdf: '',
      exchangeRate: '',
      description: `Encaissement dette ${debt.id} — ${debt.debtorName}`,
    })
  }, [open, reset, debt])

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((register) => ({
        value: extractIri(register) ?? register['@id'],
        label: formatCashRegisterSelectLabel(register),
      })),
    [cashRegisters],
  )

  const handleOpenChange = (next: boolean) => {
    if (!next && !isLoading) onOpenChange(false)
  }

  const submit = handleSubmit(async (data) => {
    if (data.mixedPayment) {
      const credit = computeMixedPaymentUsdEquivalent(
        data.paidAmountUsd ?? '',
        data.paidAmountCdf ?? '',
        exchangeRates,
        data.exchangeRate,
      )
      if (credit == null || credit <= 0 || credit > remaining + 0.001) return
      await onConfirm(data)
      return
    }
    const paidNow = parseFloat(String(data.amount ?? '').replace(',', '.')) || 0
    if (paidNow > remaining + 0.001) return
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
    ? mixedReady && !!cashRegister
    : !!cashRegister && !amountTooHigh && amountNumber > 0

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Encaisser la dette"
      description="Acompte ou solde — une entrée de caisse sera créée."
      className="rounded-2xl sm:max-w-lg"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-brand-orange/25 bg-brand-orange/5 px-4 py-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(total, debtCurrency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Déjà payé</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(paid, debtCurrency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Reste</p>
            <p className="mt-0.5 font-bold tabular-nums text-brand-orange">
              {formatMoney(remaining, debtCurrency)}
            </p>
          </div>
        </div>
        <p className="truncate text-sm font-medium">{debt.debtorName}</p>
        <p className="truncate text-xs text-muted-foreground">{debt.reason}</p>

        {canMix && (
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
                  setValue('exchangeRate', '', { shouldValidate: true })
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
        )}

        {!mixedPayment && (
          <Input
            label={`Montant à encaisser (${debtCurrency})`}
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
                const suggested = suggestMixedPaymentCdf(
                  remaining,
                  nextUsd,
                  exchangeRates,
                  CURRENCY.USD,
                  exchangeRate,
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
            <MixedExchangeRateField
              value={exchangeRate ?? ''}
              error={errors.exchangeRate?.message}
              hintRate={adminUsdToCdfRate}
              disabled={isLoading}
              onChange={(nextRate) => {
                setValue('exchangeRate', nextRate, { shouldValidate: true })
                if ((paidAmountUsd ?? '').trim()) {
                  const suggested = suggestMixedPaymentCdf(
                    remaining,
                    paidAmountUsd ?? '',
                    exchangeRates,
                    CURRENCY.USD,
                    nextRate,
                  )
                  if (suggested != null) {
                    setValue('paidAmountCdf', suggested, { shouldValidate: true })
                  }
                }
              }}
            />
            {mixedTooHigh && (
              <p className="text-xs text-destructive">Montant supérieur au reste à payer.</p>
            )}
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
              setValue('paymentCurrency', e.target.value as ManualDebtPaymentFormData['paymentCurrency'], {
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
                Encaisser
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
