import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import {
  cashTransactionConversionSchema,
  type CashTransactionConversionFormData,
} from '@/schemas/cash-transaction.schema'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useAuth } from '@/hooks/useAuth'
import { formatCashRegisterSelectLabel } from '@/lib/cash-register'
import { convertWithUsdToCdfRate, resolveUsdToCdfRate } from '@/lib/mixed-payment'
import { getActiveUsdToCdfRate } from '@/lib/exchange-rate'
import { getCurrentTravelTimeInput, getTodayTravelDateInput } from '@/lib/ticket'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { extractIri } from '@/lib/hydra'
import { CURRENCY } from '@/constants/ticket'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/utils'

const FORM_ID = 'cash-conversion-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface CashConversionFormProps {
  onSubmit: (data: CashTransactionConversionFormData) => void
  isLoading?: boolean
  submitLabel?: string
  cancelHref?: string
  defaultCashRegister?: string
}

export function CashConversionForm({
  onSubmit,
  isLoading,
  submitLabel = 'Convertir',
  cancelHref = '/cash-transactions',
  defaultCashRegister = '',
}: CashConversionFormProps) {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: registersLoading } = useCashRegistersForSelect(issuingOfficeIri)
  const { data: currencies = [], isLoading: currenciesLoading } = useCurrenciesForSelect()
  const { data: exchangeRatesData } = useExchangeRates({ pagination: false })
  const exchangeRates = exchangeRatesData?.items ?? []
  const adminRate = getActiveUsdToCdfRate(exchangeRates)

  const currencyOptions = useMemo(
    () =>
      currencies
        .filter((c) => c.active && !c.deleted && (c.code === CURRENCY.USD || c.code === CURRENCY.CDF))
        .map((c) => ({
          value: extractIri(c) ?? c['@id'],
          label: `${c.code} — ${c.label}`,
          code: c.code,
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

  const usdIri = currencyOptions.find((c) => c.code === CURRENCY.USD)?.value ?? ''
  const cdfIri = currencyOptions.find((c) => c.code === CURRENCY.CDF)?.value ?? ''

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CashTransactionConversionFormData>({
    resolver: zodResolver(cashTransactionConversionSchema),
    defaultValues: {
      cashRegister: defaultCashRegister,
      fromCurrency: '',
      toCurrency: '',
      amount: '',
      exchangeRate: '',
      description: '',
      transactionDate: getTodayTravelDateInput(),
      transactionTime: getCurrentTravelTimeInput(),
      validated: true,
    },
  })

  const cashRegister = watch('cashRegister')
  const fromCurrency = watch('fromCurrency')
  const toCurrency = watch('toCurrency')
  const amount = watch('amount')
  const exchangeRate = watch('exchangeRate')
  const validated = watch('validated')

  useEffect(() => {
    if (!defaultCashRegister) return
    setValue('cashRegister', defaultCashRegister, { shouldValidate: true })
  }, [defaultCashRegister, setValue])

  useEffect(() => {
    if (usdIri && !fromCurrency) {
      setValue('fromCurrency', usdIri, { shouldValidate: true })
    }
    if (cdfIri && !toCurrency) {
      setValue('toCurrency', cdfIri, { shouldValidate: true })
    }
  }, [usdIri, cdfIri, fromCurrency, toCurrency, setValue])

  useEffect(() => {
    if (adminRate == null || exchangeRate.trim()) return
    setValue('exchangeRate', adminRate.toFixed(2), { shouldValidate: true })
  }, [adminRate, exchangeRate, setValue])

  const fromCode =
    currencyOptions.find((c) => c.value === fromCurrency)?.code ?? CURRENCY.USD
  const toCode =
    currencyOptions.find((c) => c.value === toCurrency)?.code ?? CURRENCY.CDF

  const convertedPreview = useMemo(() => {
    const amt = parseFloat(String(amount).replace(',', '.'))
    const rate = resolveUsdToCdfRate(exchangeRates, exchangeRate)
    if (!Number.isFinite(amt) || amt <= 0 || rate == null) return null
    return convertWithUsdToCdfRate(amt, fromCode, toCode, rate)
  }, [amount, exchangeRate, exchangeRates, fromCode, toCode])

  const swapCurrencies = () => {
    setValue('fromCurrency', toCurrency, { shouldValidate: true })
    setValue('toCurrency', fromCurrency, { shouldValidate: true })
  }

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </span>
              Conversion de devise
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
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
            </div>
            <Select
              label="Devise source"
              placeholder={currenciesLoading ? 'Chargement...' : 'Source'}
              options={currencyOptions.map(({ value, label }) => ({ value, label }))}
              error={errors.fromCurrency?.message}
              disabled={currenciesLoading}
              variant="filter"
              value={fromCurrency ?? ''}
              onChange={(e) => {
                const next = e.target.value
                setValue('fromCurrency', next, { shouldValidate: true })
                if (next === toCurrency) {
                  setValue('toCurrency', next === usdIri ? cdfIri : usdIri, { shouldValidate: true })
                }
              }}
            />
            <Select
              label="Devise cible"
              placeholder={currenciesLoading ? 'Chargement...' : 'Cible'}
              options={currencyOptions.map(({ value, label }) => ({ value, label }))}
              error={errors.toCurrency?.message}
              disabled={currenciesLoading}
              variant="filter"
              value={toCurrency ?? ''}
              onChange={(e) => {
                const next = e.target.value
                setValue('toCurrency', next, { shouldValidate: true })
                if (next === fromCurrency) {
                  setValue('fromCurrency', next === usdIri ? cdfIri : usdIri, { shouldValidate: true })
                }
              }}
            />
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={swapCurrencies}
              >
                Inverser USD ↔ CDF
              </Button>
            </div>
            <Input
              label={`Montant (${fromCode})`}
              inputMode="decimal"
              error={errors.amount?.message}
              className={fieldClass}
              {...register('amount')}
            />
            <Input
              label="Taux (1 USD = … CDF)"
              inputMode="decimal"
              step="0.01"
              min="0"
              error={errors.exchangeRate?.message}
              className={fieldClass}
              {...register('exchangeRate')}
            />
            {convertedPreview != null && (
              <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Montant converti
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-brand-orange">
                  {formatMoney(convertedPreview, toCode === CURRENCY.CDF ? CURRENCY.CDF : CURRENCY.USD)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Débit {fromCode} / crédit {toCode} sur la même caisse
                </p>
              </div>
            )}
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
                Conversion...
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
                Conversion...
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
