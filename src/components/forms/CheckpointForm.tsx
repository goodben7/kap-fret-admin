import { useForm } from 'react-hook-form'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { checkpointSchema, type CheckpointFormData } from '@/schemas/checkpoint.schema'
import { Input } from '@/components/ui/input'
import { ProvinceAsyncSelect } from '@/components/ui/province-async-select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { extractIri } from '@/lib/hydra'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const FORM_ID = 'checkpoint-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface CheckpointFormProps {
  defaultValues?: Partial<CheckpointFormData>
  onSubmit: (data: CheckpointFormData) => void
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
  icon: typeof MapPin
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

function CheckpointFormActions({
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

export function CheckpointForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer',
  cancelHref = '/admin/checkpoints',
}: CheckpointFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckpointFormData>({
    resolver: zodResolver(checkpointSchema),
    defaultValues: {
      active: true,
      latitude: 0,
      longitude: 0,
      ...defaultValues,
    },
  })

  const provinceValue = watch('province')
  const isActive = watch('active')

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSection title="Informations" icon={MapPin}>
        <Input
          label="Libellé"
          placeholder="Ex. Goma, Kinshasa"
          className={fieldClass}
          error={errors.label?.message}
          {...register('label')}
        />
        <div className="sm:col-span-2">
          <ProvinceAsyncSelect
            label="Province"
            placeholder="Rechercher par nom ou code..."
            initialProvinceIri={defaultValues?.province}
            value={provinceValue ?? ''}
            onChange={(iri) => setValue('province', iri, { shouldValidate: true })}
            error={errors.province?.message}
          />
        </div>
        <Input
          label="Latitude"
          type="number"
          inputMode="decimal"
          step="any"
          className={fieldClass}
          error={errors.latitude?.message}
          {...register('latitude', { valueAsNumber: true })}
        />
        <Input
          label="Longitude"
          type="number"
          inputMode="decimal"
          step="any"
          className={fieldClass}
          error={errors.longitude?.message}
          {...register('longitude', { valueAsNumber: true })}
        />
        <div className="sm:col-span-2">
          <label
            className={cn(
              'flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors',
              isActive ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-border/80 bg-muted/20',
            )}
          >
            <div>
              <p className="text-sm font-medium">Checkpoint actif</p>
              <p className="text-xs text-muted-foreground">Disponible pour les trajets et bureaux</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 rounded border-input accent-brand-orange"
              {...register('active')}
            />
          </label>
        </div>
      </FormSection>

      <CheckpointFormActions
        formId={FORM_ID}
        isLoading={isLoading}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  )
}

export function resolveProvinceValue(province: string | { '@id': string } | undefined): string {
  return extractIri(province) ?? (typeof province === 'string' ? province : '')
}
