import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useCreateUser } from '@/hooks/useUsers'
import { UserCreateForm } from '@/components/forms/UserCreateForm'
import type { UserCreateFormData } from '@/schemas/user.schema'
import type { UserCreatePayload } from '@/types/user'

export function UserFormPage() {
  const navigate = useNavigate()
  const createUser = useCreateUser()

  const handleSubmit = async (data: UserCreateFormData) => {
    const payload: UserCreatePayload = {
      email: data.email,
      plainPassword: data.plainPassword,
      profile: data.profile,
      phone: data.phone,
      displayName: data.displayName,
    }

    if (data.holderId) {
      payload.holderId = data.holderId
      payload.holderType = 'ISSUING_OFFICE'
    }

    const created = await createUser.mutateAsync(payload)
    void navigate(`/admin/users/${created.id}/edit`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Utilisateurs
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Nouvel utilisateur</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          Créez un compte et assignez un profil d'accès
        </p>
      </div>

      <UserCreateForm onSubmit={handleSubmit} isLoading={createUser.isPending} cancelHref="/admin/users" />
    </div>
  )
}
