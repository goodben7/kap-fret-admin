import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, User } from 'lucide-react'
import { useUser, useUpdateUser, useChangeUserCredentials } from '@/hooks/useUsers'
import { UserEditForm } from '@/components/forms/UserEditForm'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PERSON_TYPE_LABELS } from '@/constants/profile'
import type { PersonType } from '@/constants/profile'
import { getUserProfileLabel } from '@/types/user'
import type { UserUpdateFormData, UserCredentialsFormData } from '@/schemas/user.schema'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

export function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = id ?? ''

  const { data: user, isLoading } = useUser(userId)
  const updateUser = useUpdateUser()
  const changeCredentials = useChangeUserCredentials()

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [actualPassword, setActualPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement de l'utilisateur..." />
      </div>
    )
  }

  if (!user) return <p className="p-4 text-muted-foreground">Utilisateur introuvable</p>

  const handleUpdate = async (data: UserUpdateFormData) => {
    await updateUser.mutateAsync({ id: userId, payload: data })
    void navigate('/admin/users')
  }

  const handleChangePassword = async () => {
    if (!actualPassword || !newPassword) return
    const payload: UserCredentialsFormData = { actualPassword, newPassword }
    await changeCredentials.mutateAsync({ id: userId, payload })
    setPasswordModalOpen(false)
    setActualPassword('')
    setNewPassword('')
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
            <User className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight truncate">{user.displayName}</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground truncate">{user.email}</p>
      </div>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Compte</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          {user.personType && (
            <Badge variant="secondary">
              {PERSON_TYPE_LABELS[user.personType as PersonType] ?? user.personType}
            </Badge>
          )}
          <Badge variant={user.locked ? 'destructive' : 'success'}>
            {user.locked ? 'Verrouillé' : 'Actif'}
          </Badge>
          <Badge variant="outline">Profil : {getUserProfileLabel(user)}</Badge>
          {user.holderId && (
            <Badge variant="outline">Bureau : {user.holderId}</Badge>
          )}
        </CardContent>
      </Card>

      <UserEditForm
        defaultValues={{
          email: user.email,
          phone: user.phone ?? '',
          displayName: user.displayName,
        }}
        onSubmit={handleUpdate}
        isLoading={updateUser.isPending}
        cancelHref="/admin/users"
      />

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </span>
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl sm:w-auto"
            onClick={() => setPasswordModalOpen(true)}
          >
            Changer le mot de passe
          </Button>
        </CardContent>
      </Card>

      <Modal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        title="Changer le mot de passe"
        description="Le mot de passe actuel est requis pour confirmer l'opération."
      >
        <div className="space-y-4">
          <Input
            label="Mot de passe actuel"
            type="password"
            className={fieldClass}
            value={actualPassword}
            onChange={(e) => setActualPassword(e.target.value)}
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            className={fieldClass}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setPasswordModalOpen(false)}>
              Annuler
            </Button>
            <Button
              className="h-11 rounded-xl"
              onClick={handleChangePassword}
              disabled={!actualPassword || !newPassword || changeCredentials.isPending}
            >
              {changeCredentials.isPending ? 'Confirmation...' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
