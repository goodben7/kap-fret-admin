import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import {
  cashTransactionCreateSchema,
  type CashTransactionCreateFormData,
} from '@/schemas/cash-transaction.schema'
import {
  CASH_TRANSACTION_REFERENCE_TYPE,
  CASH_TRANSACTION_REFERENCE_TYPE_OPTIONS,
  CASH_TRANSACTION_TYPE,
  CASH_TRANSACTION_TYPE_OPTIONS,
} from '@/constants/cash-transaction'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { usePreviewConversion } from '@/hooks/usePreviewConversion'
import { useAuth } from '@/hooks/useAuth'
import { formatCashRegisterSelectLabel } from '@/lib/cash-register'
import { getCurrentTravelTimeInput, getTodayTravelDateInput } from '@/lib/ticket'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { extractIri } from '@/lib/hydra'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConversionPreviewCard } from '@/components/tickets/ConversionPreviewCard'
import { Receipt } from 'lucide-react'

const FORM_ID = 'cash-transaction-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface CashTransactionFormProps {
  onSubmit: (data: CashTransactionCreateFormData) => void
  isLoading?: boolean
  submitLabel?: string
  cancelHref?: string
}

export function CashTransactionForm({
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer',
  cancelHref = '/cash-transactions',
}: CashTransactionFormProps) {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: registersLoading } = useCashRegistersForSelect(issuingOfficeIri)
  const { data: currencies = [], isLoading: currenciesLoading } = useCurrenciesForSelect()

  const currencyOptions = useMemo(
    () =>
      currencies
        .filter((c) => c.active && !c.deleted)
        .map((c) => ({
          value: extractIri(c) ?? c['@id'],
          label: `${c.code} — ${c.label}`,
        })),
    [currencies],
  )

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((register) => ({
        value: extractIri(register) ?? register['@id'],
        label: formatCashRegisterSelectLabel(register),
      })),
    [cashRegisters],
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CashTransactionCreateFormData>({
    resolver: zodResolver(cashTransactionCreateSchema),
    defaultValues: {
      type: CASH_TRANSACTION_TYPE.ENTRY,
      referenceType: CASH_TRANSACTION_REFERENCE_TYPE.MANUAL,
      transactionDate: getTodayTravelDateInput(),
      transactionTime: getCurrentTravelTimeInput(),
      amount: '',
      currency: '',
      cashRegister: '',
      description: '',
      referenceId: '',
      validated: true,
    },
  })

  const cashRegister = watch('cashRegister')
  const amount = watch('amount')
  const currency = watch('currency')
  const referenceType = watch('referenceType')
  const showReferenceId = referenceType !== CASH_TRANSACTION_REFERENCE_TYPE.MANUAL

  const previewEnabled = !!cashRegister && !!currency && (parseFloat(amount) || 0) > 0
  const {
    data: conversionPreview,
    isLoading: conversionPreviewLoading,
    isError: conversionPreviewError,
  } = usePreviewConversion({
    cashRegister: cashRegister || undefined,
    amount: amount ?? '',
    currencyIri: currency || undefined,
    enabled: previewEnabled,
  })

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </span>
            Transaction
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Caisse"
            placeholder={registersLoading ? 'Chargement...' : 'Sélectionner une caisse'}
            options={cashRegisterOptions}
            error={errors.cashRegister?.message}
            disabled={registersLoading || cashRegisterOptions.length === 0}
            variant="filter"
            value={cashRegister ?? ''}
            onChange={(e) => setValue('cashRegister', e.target.value, { shouldValidate: true })}
          />
          <Select
            label="Type"
            options={CASH_TRANSACTION_TYPE_OPTIONS}
            error={errors.type?.message}
            variant="filter"
            value={watch('type') ?? ''}
            onChange={(e) =>
              setValue('type', e.target.value as CashTransactionCreateFormData['type'], { shouldValidate: true })
            }
          />
          <Input
            label="Montant"
            inputMode="decimal"
            error={errors.amount?.message}
            className={fieldClass}
            {...register('amount')}
          />
          <Select
            label="Devise"
            placeholder={currenciesLoading ? 'Chargement...' : 'Sélectionner une devise'}
            options={currencyOptions}
            error={errors.currency?.message}
            disabled={currenciesLoading}
            variant="filter"
            value={watch('currency') ?? ''}
            onChange={(e) => setValue('currency', e.target.value, { shouldValidate: true })}
          />
          {previewEnabled && (
            <ConversionPreviewCard
              preview={conversionPreview}
              isLoading={conversionPreviewLoading}
              isError={conversionPreviewError}
            />
          )}
          <div className="sm:col-span-2">
            <Input
              label="Description"
              error={errors.description?.message}
              className={fieldClass}
              {...register('description')}
            />
          </div>
          <Select
            label="Type de référence"
            options={CASH_TRANSACTION_REFERENCE_TYPE_OPTIONS}
            error={errors.referenceType?.message}
            variant="filter"
            value={referenceType ?? ''}
            onChange={(e) =>
              setValue('referenceType', e.target.value as CashTransactionCreateFormData['referenceType'], {
                shouldValidate: true,
              })
            }
          />
          {showReferenceId && (
            <Input
              label="ID référence"
              placeholder="Ex. TKNKPI0622110118"
              error={errors.referenceId?.message}
              className={fieldClass}
              {...register('referenceId')}
            />
          )}
          <Input
            label="Date de transaction"
            type="date"
            error={errors.transactionDate?.message}
            className={fieldClass}
            {...register('transactionDate')}
          />
          <Input
            label="Heure de transaction"
            type="time"
            error={errors.transactionTime?.message}
            className={fieldClass}
            {...register('transactionTime')}
          />
          <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/25 px-4 py-3 sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('validated')} />
            <span className="text-sm font-medium">Valider immédiatement la transaction</span>
          </label>
        </CardContent>
      </Card>

      <div className="hidden justify-end gap-3 lg:flex">
        {cancelHref && (
          <Button type="button" variant="outline" asChild className="h-11 rounded-xl">
            <Link to={cancelHref}>Annuler</Link>
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="h-11 rounded-xl px-8">
          {isLoading ? (
            <>
              <LoaderIcon />
              Enregistrement...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-3xl space-y-2 p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90"
          >
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              submitLabel
            )}
          </Button>
          {cancelHref && (
            <Button type="button" variant="outline" asChild className="h-11 w-full rounded-xl">
              <Link to={cancelHref}>Annuler</Link>
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
