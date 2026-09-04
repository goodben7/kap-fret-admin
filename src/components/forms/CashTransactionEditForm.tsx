import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import {
  cashTransactionPatchSchema,
  type CashTransactionPatchFormData,
} from '@/schemas/cash-transaction.schema'
import { CASH_TRANSACTION_MANUAL_TYPE_OPTIONS } from '@/constants/cash-transaction'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { useAuth } from '@/hooks/useAuth'
import { formatCashRegisterSelectLabel } from '@/lib/cash-register'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { extractIri } from '@/lib/hydra'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const FORM_ID = 'cash-transaction-edit-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface CashTransactionEditFormProps {
  defaultValues: CashTransactionPatchFormData
  onSubmit: (data: CashTransactionPatchFormData) => void
  isLoading?: boolean
  submitLabel?: string
  cancelHref: string
}

export function CashTransactionEditForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer les modifications',
  cancelHref,
}: CashTransactionEditFormProps) {
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
  } = useForm<CashTransactionPatchFormData>({
    resolver: zodResolver(cashTransactionPatchSchema),
    defaultValues,
  })

  const cashRegister = watch('cashRegister')

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </span>
            Modifier le mouvement
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
            options={CASH_TRANSACTION_MANUAL_TYPE_OPTIONS}
            error={errors.type?.message}
            variant="filter"
            value={watch('type') ?? ''}
            onChange={(e) =>
              setValue('type', e.target.value as CashTransactionPatchFormData['type'], {
                shouldValidate: true,
              })
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
              label="Description"
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
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Seuls les mouvements manuels non validés (entrée / sortie) peuvent être modifiés.
          </p>
        </CardContent>
      </Card>

      <div className="hidden justify-end gap-3 lg:flex">
        <Button type="button" variant="outline" asChild className="h-11 rounded-xl">
          <Link to={cancelHref}>Annuler</Link>
        </Button>
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
          <Button type="button" variant="outline" asChild className="h-11 w-full rounded-xl">
            <Link to={cancelHref}>Annuler</Link>
          </Button>
        </div>
      </div>
    </form>
  )
}
