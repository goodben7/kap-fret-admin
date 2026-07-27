import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import {
  cashTransactionTransferSchema,
  type CashTransactionTransferFormData,
} from '@/schemas/cash-transaction.schema'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { useAuth } from '@/hooks/useAuth'
import { formatCashRegisterSelectLabel } from '@/lib/cash-register'
import { getCurrentTravelTimeInput, getTodayTravelDateInput } from '@/lib/ticket'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { extractIri } from '@/lib/hydra'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const FORM_ID = 'cash-transfer-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface CashTransferFormProps {
  onSubmit: (data: CashTransactionTransferFormData) => void
  isLoading?: boolean
  submitLabel?: string
  cancelHref?: string
  defaultSourceCashRegister?: string
}

export function CashTransferForm({
  onSubmit,
  isLoading,
  submitLabel = 'Effectuer le transfert',
  cancelHref = '/admin/cash-registers',
  defaultSourceCashRegister = '',
}: CashTransferFormProps) {
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
      cashRegisters
        .filter((register) => register.active && !register.deleted)
        .map((register) => ({
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
  } = useForm<CashTransactionTransferFormData>({
    resolver: zodResolver(cashTransactionTransferSchema),
    defaultValues: {
      sourceCashRegister: defaultSourceCashRegister,
      destinationCashRegister: '',
      amount: '',
      currency: '',
      description: '',
      transactionDate: getTodayTravelDateInput(),
      transactionTime: getCurrentTravelTimeInput(),
      validated: true,
    },
  })

  const sourceCashRegister = watch('sourceCashRegister')
  const destinationCashRegister = watch('destinationCashRegister')
  const validated = watch('validated')

  useEffect(() => {
    if (!defaultSourceCashRegister) return
    setValue('sourceCashRegister', defaultSourceCashRegister, { shouldValidate: true })
  }, [defaultSourceCashRegister, setValue])

  const destinationOptions = useMemo(
    () => cashRegisterOptions.filter((option) => option.value !== sourceCashRegister),
    [cashRegisterOptions, sourceCashRegister],
  )

  const sourceOptions = useMemo(
    () => cashRegisterOptions.filter((option) => option.value !== destinationCashRegister),
    [cashRegisterOptions, destinationCashRegister],
  )

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              </span>
              Transfert
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Caisse source"
              placeholder={registersLoading ? 'Chargement...' : 'Sélectionner la caisse source'}
              options={sourceOptions}
              error={errors.sourceCashRegister?.message}
              disabled={registersLoading || sourceOptions.length === 0}
              variant="filter"
              value={sourceCashRegister ?? ''}
              onChange={(e) =>
                setValue('sourceCashRegister', e.target.value, { shouldValidate: true })
              }
            />
            <Select
              label="Caisse destination"
              placeholder={registersLoading ? 'Chargement...' : 'Sélectionner la caisse destination'}
              options={destinationOptions}
              error={errors.destinationCashRegister?.message}
              disabled={registersLoading || destinationOptions.length === 0}
              variant="filter"
              value={destinationCashRegister ?? ''}
              onChange={(e) =>
                setValue('destinationCashRegister', e.target.value, { shouldValidate: true })
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
            <div className="sm:col-span-2">
              <Input
                label="Description (optionnel)"
                error={errors.description?.message}
                className={fieldClass}
                {...register('description')}
              />
            </div>
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
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={validated === false}
                onChange={(e) =>
                  setValue('validated', !e.target.checked, { shouldValidate: true })
                }
              />
              <span className="text-sm font-medium">Cette opération nécessite une validation</span>
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
                Transfert...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>

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
                Transfert...
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
    </>
  )
}
