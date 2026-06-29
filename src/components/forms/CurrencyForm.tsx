import { useForm } from 'react-hook-form'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Banknote } from 'lucide-react'
import { currencySchema, type CurrencyFormData } from '@/schemas/currency.schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const FORM_ID = 'currency-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface CurrencyFormProps {
  defaultValues?: Partial<CurrencyFormData>
  onSubmit: (data: CurrencyFormData) => void
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
  icon: typeof Banknote
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

function ToggleField({
  label,
  description,
  checked,
  name,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  name: string
  onChange: () => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors sm:col-span-2',
        checked ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-border/80 bg-muted/20',
      )}
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 shrink-0 rounded border-input accent-brand-orange"
      />
    </label>
  )
}

function CurrencyFormActions({
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

export function CurrencyForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer',
  cancelHref = '/admin/currencies',
}: CurrencyFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CurrencyFormData>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      active: true,
      isDefault: false,
      ...defaultValues,
    },
  })

  const isActive = watch('active')
  const isDefault = watch('isDefault')

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSection title="Devise" icon={Banknote}>
        <Input
          label="Code"
          placeholder="Ex. CDF, USD"
          className={cn(fieldClass, 'font-mono uppercase')}
          error={errors.code?.message}
          {...register('code')}
        />
        <Input
          label="Symbole"
          placeholder="Ex. FC, $"
          className={fieldClass}
          error={errors.symbol?.message}
          {...register('symbol')}
        />
        <div className="sm:col-span-2">
          <Input
            label="Libellé"
            placeholder="Ex. Franc congolais"
            className={fieldClass}
            error={errors.label?.message}
            {...register('label')}
          />
        </div>
        <ToggleField
          name="active"
          label="Devise active"
          description="Une devise inactive ne peut plus être utilisée pour les ventes"
          checked={isActive}
          onChange={() => setValue('active', !isActive, { shouldValidate: true, shouldDirty: true })}
        />
        <ToggleField
          name="isDefault"
          label="Devise par défaut"
          description="Utilisée par défaut lors de la création de billets et d'expéditions"
          checked={isDefault}
          onChange={() => setValue('isDefault', !isDefault, { shouldValidate: true, shouldDirty: true })}
        />
      </FormSection>

      <CurrencyFormActions
        formId={FORM_ID}
        isLoading={isLoading}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  )
}
