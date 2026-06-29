import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Banknote, Building2 } from 'lucide-react'
import { issuingOfficeSchema, type IssuingOfficeFormData } from '@/schemas/issuing-office.schema'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { extractIri } from '@/lib/hydra'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const FORM_ID = 'issuing-office-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface IssuingOfficeFormProps {
  isEdit?: boolean
  defaultValues?: Partial<IssuingOfficeFormData>
  onSubmit: (data: IssuingOfficeFormData) => void
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
  icon: typeof Building2
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

function OfficeFormActions({
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

export function IssuingOfficeForm({
  isEdit = false,
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer',
  cancelHref = '/admin/issuing-offices',
}: IssuingOfficeFormProps) {
  const { data: currencies = [], isLoading: currenciesLoading } = useCurrenciesForSelect({
    enabled: isEdit,
  })

  const currencyOptions = useMemo(() => {
    return currencies
      .filter((currency) => currency.active && !currency.deleted)
      .map((currency) => ({
        value: extractIri(currency) ?? currency['@id'],
        label: `${currency.code} — ${currency.label}`,
      }))
  }, [currencies])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<IssuingOfficeFormData>({
    resolver: zodResolver(issuingOfficeSchema),
    defaultValues: {
      active: true,
      currency: '',
      ...defaultValues,
    },
  })

  useEffect(() => {
    reset({
      active: true,
      currency: '',
      ...defaultValues,
    })
  }, [defaultValues?.code, defaultValues?.name, defaultValues?.checkpoint, defaultValues?.currency, defaultValues?.phone, defaultValues?.address, defaultValues?.active, reset])

  const checkpointValue = watch('checkpoint')
  const currencyValue = watch('currency')
  const isActive = watch('active')

  const currencySelectOptions = useMemo(
    () => [{ value: '', label: 'Aucune' }, ...currencyOptions],
    [currencyOptions],
  )

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSection title="Informations" icon={Building2}>
        <Input
          label="Code"
          placeholder="Ex. OFFICE-001"
          className={fieldClass}
          error={errors.code?.message}
          {...register('code')}
        />
        <Input
          label="Nom"
          placeholder="Ex. Bureau Goma"
          className={fieldClass}
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="sm:col-span-2">
          <CheckpointAsyncSelect
            label="Checkpoint"
            placeholder="Rechercher par nom (ex. Goma, Kinshasa)..."
            variant="filter"
            initialCheckpointIri={defaultValues?.checkpoint}
            value={checkpointValue ?? ''}
            onChange={(iri) => setValue('checkpoint', iri, { shouldValidate: true })}
            error={errors.checkpoint?.message}
          />
        </div>
        <Input
          label="Téléphone"
          type="tel"
          placeholder="+243..."
          className={fieldClass}
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="sm:col-span-2">
          <Input
            label="Adresse"
            placeholder="Adresse du bureau"
            className={fieldClass}
            error={errors.address?.message}
            {...register('address')}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            className={cn(
              'flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors',
              isActive ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-border/80 bg-muted/20',
            )}
          >
            <div>
              <p className="text-sm font-medium">Bureau actif</p>
              <p className="text-xs text-muted-foreground">Le bureau peut émettre des billets et opérations</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 rounded border-input accent-brand-orange"
              {...register('active')}
            />
          </label>
        </div>
      </FormSection>

      {isEdit && (
        <FormSection title="Devise" icon={Banknote}>
          <div className="sm:col-span-2">
            <Select
              label="Devise par défaut"
              placeholder={currenciesLoading ? 'Chargement des devises...' : 'Sélectionner une devise'}
              options={currencySelectOptions}
              value={currencyValue ?? ''}
              onChange={(e) => setValue('currency', e.target.value, { shouldValidate: true, shouldDirty: true })}
              error={errors.currency?.message}
              variant="filter"
              disabled={currenciesLoading}
            />
            {!currenciesLoading && currencyOptions.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Aucune devise active. Créez-en une dans Administration → Devises.
              </p>
            )}
          </div>
        </FormSection>
      )}

      <OfficeFormActions
        formId={FORM_ID}
        isLoading={isLoading}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  )
}

export function resolveCheckpointValue(checkpoint: string | { '@id': string } | undefined): string {
  return extractIri(checkpoint) ?? (typeof checkpoint === 'string' ? checkpoint : '')
}
