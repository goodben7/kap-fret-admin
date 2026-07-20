import { useForm } from 'react-hook-form'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import {
  cashRegisterCreateSchema,
  cashRegisterPatchSchema,
  type CashRegisterCreateFormData,
  type CashRegisterPatchFormData,
} from '@/schemas/cash-register.schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const CREATE_FORM_ID = 'cash-register-create-form'
const PATCH_FORM_ID = 'cash-register-patch-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface CashRegisterCreateFormProps {
  defaultValues?: Partial<CashRegisterCreateFormData>
  onSubmit: (data: CashRegisterCreateFormData) => void
  isLoading?: boolean
  submitLabel?: string
  cancelHref?: string
}

interface CashRegisterPatchFormProps {
  defaultValues?: Partial<CashRegisterPatchFormData>
  onSubmit: (data: CashRegisterPatchFormData) => void
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
  icon: typeof Wallet
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

function FormActions({
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

export function CashRegisterCreateForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Créer le registre',
  cancelHref = '/admin/cash-registers',
}: CashRegisterCreateFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CashRegisterCreateFormData>({
    resolver: zodResolver(cashRegisterCreateSchema),
    defaultValues: {
      openingBalanceCDF: '0.00',
      openingBalanceUSD: '0.00',
      active: true,
      ...defaultValues,
    },
  })

  const isActive = watch('active')

  return (
    <form id={CREATE_FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSection title="Registre" icon={Wallet}>
        <Input
          label="Code"
          placeholder="Ex. CASH-001"
          className={cn(fieldClass, 'font-mono')}
          error={errors.code?.message}
          {...register('code')}
        />
        <Input
          label="Nom"
          placeholder="Ex. Guichet principal"
          className={fieldClass}
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Solde d'ouverture USD"
          inputMode="decimal"
          placeholder="0.00"
          className={fieldClass}
          error={errors.openingBalanceUSD?.message}
          {...register('openingBalanceUSD')}
        />
        <Input
          label="Solde d'ouverture CDF"
          inputMode="decimal"
          placeholder="0.00"
          className={fieldClass}
          error={errors.openingBalanceCDF?.message}
          {...register('openingBalanceCDF')}
        />
        <div className="sm:col-span-2">
          <label
            className={cn(
              'flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors',
              isActive ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-border/80 bg-muted/20',
            )}
          >
            <div>
              <p className="text-sm font-medium">Registre actif</p>
              <p className="text-xs text-muted-foreground">Un registre inactif ne peut plus être utilisé</p>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => setValue('active', !isActive, { shouldValidate: true, shouldDirty: true })}
              className="h-5 w-5 shrink-0 rounded border-input accent-brand-orange"
            />
          </label>
        </div>
      </FormSection>

      <FormActions
        formId={CREATE_FORM_ID}
        isLoading={isLoading}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  )
}

export function CashRegisterPatchForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer les modifications',
  cancelHref,
}: CashRegisterPatchFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CashRegisterPatchFormData>({
    resolver: zodResolver(cashRegisterPatchSchema),
    defaultValues: {
      active: true,
      ...defaultValues,
    },
  })

  const isActive = watch('active')

  return (
    <form id={PATCH_FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSection title="Registre" icon={Wallet}>
        <Input
          label="Code"
          placeholder="Ex. CASH-001"
          className={cn(fieldClass, 'font-mono')}
          error={errors.code?.message}
          {...register('code')}
        />
        <Input
          label="Nom"
          placeholder="Ex. Guichet principal"
          className={fieldClass}
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="sm:col-span-2">
          <label
            className={cn(
              'flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors',
              isActive ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-border/80 bg-muted/20',
            )}
          >
            <div>
              <p className="text-sm font-medium">Registre actif</p>
              <p className="text-xs text-muted-foreground">Les soldes d'ouverture ne sont pas modifiables ici</p>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => setValue('active', !isActive, { shouldValidate: true, shouldDirty: true })}
              className="h-5 w-5 shrink-0 rounded border-input accent-brand-orange"
            />
          </label>
        </div>
      </FormSection>

      <FormActions
        formId={PATCH_FORM_ID}
        isLoading={isLoading}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  )
}
