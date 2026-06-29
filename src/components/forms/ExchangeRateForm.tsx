import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { exchangeRateSchema, type ExchangeRateFormData } from '@/schemas/exchange-rate.schema'
import { useCurrencies } from '@/hooks/useCurrencies'
import { extractIri } from '@/lib/hydra'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const FORM_ID = 'exchange-rate-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface ExchangeRateFormProps {
  defaultValues?: Partial<ExchangeRateFormData>
  onSubmit: (data: ExchangeRateFormData) => void
  isLoading?: boolean
  submitLabel?: string
  cancelHref?: string
}

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof ArrowLeftRight
  children: ReactNode
}) {
  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">{children}</CardContent>
    </Card>
  )
}

function ExchangeRateFormActions({
  formId,
  isLoading,
  submitLabel,
  cancelHref,
}: {
  formId: string
  isLoading?: boolean
  submitLabel: string
  cancelHref?: string
}) {
  return (
    <>
      <div className="hidden flex-col items-end gap-3 pt-2 lg:flex">
        <div className="flex gap-3">
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
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl space-y-2 p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button
            type="submit"
            form={formId}
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
    </>
  )
}

export function ExchangeRateForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer',
  cancelHref = '/admin/exchange-rates',
}: ExchangeRateFormProps) {
  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies({ pagination: false })

  const currencyOptions = useMemo(() => {
    return (currenciesData?.items ?? [])
      .filter((currency) => currency.active && !currency.deleted)
      .map((currency) => ({
        value: extractIri(currency) ?? currency['@id'],
        label: `${currency.code} — ${currency.label}`,
      }))
  }, [currenciesData?.items])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExchangeRateFormData>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: {
      baseRate: '1',
      targetRate: '1',
      active: true,
      ...defaultValues,
    },
  })

  const baseCurrency = watch('baseCurrency')
  const targetCurrency = watch('targetCurrency')
  const isActive = watch('active')

  if (currenciesLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner label="Chargement des devises..." />
      </div>
    )
  }

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSection title="Paire de devises" icon={ArrowLeftRight}>
        <Select
          label="Devise source"
          placeholder="Sélectionner..."
          options={[{ value: '', label: 'Sélectionner...' }, ...currencyOptions]}
          value={baseCurrency ?? ''}
          onChange={(e) => setValue('baseCurrency', e.target.value, { shouldValidate: true })}
          error={errors.baseCurrency?.message}
          variant="filter"
        />
        <Select
          label="Devise cible"
          placeholder="Sélectionner..."
          options={[{ value: '', label: 'Sélectionner...' }, ...currencyOptions]}
          value={targetCurrency ?? ''}
          onChange={(e) => setValue('targetCurrency', e.target.value, { shouldValidate: true })}
          error={errors.targetCurrency?.message}
          variant="filter"
        />
        <Input
          label="Montant source"
          inputMode="decimal"
          placeholder="Ex. 2300"
          className={fieldClass}
          error={errors.baseRate?.message}
          {...register('baseRate')}
        />
        <Input
          label="Montant cible"
          inputMode="decimal"
          placeholder="Ex. 1"
          className={fieldClass}
          error={errors.targetRate?.message}
          {...register('targetRate')}
        />
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Exemple : 2300 CDF = 1 USD signifie source CDF avec montant 2300 et cible USD avec montant 1.
        </p>
        <label
          className={cn(
            'flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors sm:col-span-2',
            isActive ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-border/80 bg-muted/20',
          )}
        >
          <div>
            <p className="text-sm font-medium">Taux actif</p>
            <p className="text-xs text-muted-foreground">Un taux inactif ne sera plus utilisé pour les conversions</p>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => setValue('active', !isActive, { shouldValidate: true, shouldDirty: true })}
            className="h-5 w-5 shrink-0 rounded border-input accent-brand-orange"
          />
        </label>
      </FormSection>

      <ExchangeRateFormActions
        formId={FORM_ID}
        isLoading={isLoading}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  )
}
