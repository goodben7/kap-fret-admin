import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { officeAdminAccessSchema, type OfficeAdminAccessFormData } from '@/schemas/issuing-office.schema'
import { useProfiles } from '@/hooks/useProfiles'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toIri } from '@/lib/hydra'
import type { IssuingOffice } from '@/types/issuing-office'

interface OfficeAdminAccessModalContentProps {
  office: IssuingOffice
  onSubmit: (data: OfficeAdminAccessFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function OfficeAdminAccessModalContent({
  office,
  onSubmit,
  onCancel,
  isLoading,
}: OfficeAdminAccessModalContentProps) {
  const { data: profiles, isLoading: profilesLoading } = useProfiles({ itemsPerPage: 100 })

  const admProfiles = (profiles?.items ?? []).filter((p) => p.personType === 'ADM')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OfficeAdminAccessFormData>({
    resolver: zodResolver(officeAdminAccessSchema),
  })

  const profileOptions = [
    { value: '', label: 'Sélectionner un profil ADM...' },
    ...admProfiles.map((p) => ({
      value: p['@id'] ?? toIri('profiles', p.id),
      label: p.label,
    })),
  ]

  if (profilesLoading) return <LoadingSpinner size="sm" label="Chargement des profils..." />

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Création de l'administrateur pour le bureau <strong>{office.name}</strong> ({office.code})
      </p>

      <Input label="Nom affiché" error={errors.displayName?.message} {...register('displayName')} />
      <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <Input label="Téléphone" error={errors.phone?.message} {...register('phone')} />
      <Input
        label="Mot de passe"
        type="password"
        error={errors.plainPassword?.message}
        {...register('plainPassword')}
      />

      <Select
        label="Profil (ADM uniquement)"
        options={profileOptions}
        error={errors.profile?.message}
        value={watch('profile') ?? ''}
        onChange={(e) => setValue('profile', e.target.value, { shouldValidate: true })}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={isLoading || admProfiles.length === 0}>
          {isLoading ? 'Création...' : 'Créer l\'administrateur'}
        </Button>
      </div>

      {admProfiles.length === 0 && (
        <p className="text-sm text-destructive">Aucun profil avec personType ADM disponible.</p>
      )}
    </form>
  )
}
