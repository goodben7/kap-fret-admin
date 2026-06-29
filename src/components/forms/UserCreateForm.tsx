import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Building2, User } from 'lucide-react'
import { userCreateSchema, type UserCreateFormData } from '@/schemas/user.schema'
import { useProfiles } from '@/hooks/useProfiles'
import { useIssuingOffices } from '@/hooks/useIssuingOffices'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoaderIcon, LoadingSpinner } from '@/components/ui/loading-spinner'
import { toIri } from '@/lib/hydra'
import type { ReactNode } from 'react'

const FORM_ID = 'user-create-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface UserCreateFormProps {
  onSubmit: (data: UserCreateFormData) => void
  isLoading?: boolean
  cancelHref?: string
}

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof User
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

function UserFormActions({
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

export function UserCreateForm({ onSubmit, isLoading, cancelHref = '/admin/users' }: UserCreateFormProps) {
  const { data: profiles, isLoading: profilesLoading } = useProfiles({ itemsPerPage: 100 })
  const { data: offices, isLoading: officesLoading } = useIssuingOffices({ itemsPerPage: 100 })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateSchema),
  })

  const profileOptions = (profiles?.items ?? []).map((p) => ({
    value: p['@id'] ?? toIri('profiles', p.id),
    label: `${p.label} (${p.personType})`,
  }))

  const officeOptions = [
    { value: '', label: 'Aucun bureau d\'émission' },
    ...(offices?.items ?? []).map((o) => ({
      value: String(o.id),
      label: o.name ?? String(o.id),
    })),
  ]

  if (profilesLoading || officesLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement des données..." />
      </div>
    )
  }

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSection title="Identité" icon={User}>
        <Input
          label="Nom affiché"
          placeholder="Ex. Jean Dupont"
          className={fieldClass}
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="agent@kap-air.cd"
          className={fieldClass}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Téléphone"
          type="tel"
          placeholder="+243..."
          className={fieldClass}
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Mot de passe"
          type="password"
          className={fieldClass}
          error={errors.plainPassword?.message}
          {...register('plainPassword')}
        />
      </FormSection>

      <FormSection title="Rattachement" icon={Building2}>
        <Select
          label="Profil"
          variant="filter"
          options={[{ value: '', label: 'Sélectionner un profil...' }, ...profileOptions]}
          error={errors.profile?.message}
          value={watch('profile') ?? ''}
          onChange={(e) => setValue('profile', e.target.value, { shouldValidate: true })}
        />
        <Select
          label="Bureau d'émission (optionnel)"
          variant="filter"
          options={officeOptions}
          value={watch('holderId') ?? ''}
          onChange={(e) => setValue('holderId', e.target.value || undefined)}
        />
      </FormSection>

      <UserFormActions
        formId={FORM_ID}
        isLoading={isLoading}
        submitLabel="Créer l'utilisateur"
        cancelHref={cancelHref}
      />
    </form>
  )
}
