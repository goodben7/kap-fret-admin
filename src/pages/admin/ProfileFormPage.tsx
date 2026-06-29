import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { useProfile, useCreateProfile, useUpdateProfile } from '@/hooks/useProfiles'
import { ProfileForm } from '@/components/forms/ProfileForm'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { ProfileFormData } from '@/schemas/profile.schema'

export function ProfileFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: profile, isLoading } = useProfile(isEdit ? id : '')
  const createProfile = useCreateProfile()
  const updateProfile = useUpdateProfile()

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement du profil..." />
      </div>
    )
  }

  const defaultValues: Partial<ProfileFormData> | undefined = profile
    ? {
        label: profile.label,
        personType: profile.personType as ProfileFormData['personType'],
        permission: profile.permission ?? [],
        active: profile.active,
      }
    : undefined

  const handleSubmit = async (data: ProfileFormData) => {
    if (isEdit && id) {
      await updateProfile.mutateAsync({ id, payload: data })
      void navigate('/admin/profiles')
    } else {
      const created = await createProfile.mutateAsync(data)
      void navigate(`/admin/profiles/${created.id}/edit`)
    }
  }

  const isPending = createProfile.isPending || updateProfile.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/profiles"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Profils
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Modifier le profil' : 'Nouveau profil'}
          </h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          {isEdit
            ? (profile?.label ?? 'Mettre à jour le libellé, le type et les permissions')
            : 'Définissez un profil et ses permissions d\'accès'}
        </p>
      </div>

      <ProfileForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel={isEdit ? 'Enregistrer les modifications' : 'Créer le profil'}
        cancelHref="/admin/profiles"
      />
    </div>
  )
}
