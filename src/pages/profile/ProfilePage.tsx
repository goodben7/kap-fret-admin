import { useState } from 'react'
import { Building2, KeyRound, LogOut, Mail, Phone, Shield, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useChangeMyPassword, useUpdateMyProfile } from '@/hooks/useMyProfile'
import { ROLE_LABELS } from '@/constants/roles'
import { PERSON_TYPE_LABELS } from '@/constants/profile'
import type { Role } from '@/constants/roles'
import type { PersonType } from '@/constants/profile'
import { getDisplayName } from '@/lib/normalize-user'
import { UserEditForm } from '@/components/forms/UserEditForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import type { UserCredentialsFormData, UserUpdateFormData } from '@/schemas/user.schema'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail
  label: string
  value: string
  href?: string
}) {
  const content = (
    <span className="text-sm font-medium break-all">{value}</span>
  )

  return (
    <div className="flex items-start gap-3 border-b border-border/50 py-3 last:border-0 last:pb-0 first:pt-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} className="text-sm font-medium text-primary hover:underline break-all">
            {value}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { user, issuingOfficeName, logout } = useAuth()
  const updateProfile = useUpdateMyProfile()
  const changePassword = useChangeMyPassword()

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [actualPassword, setActualPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  if (!user) return null

  const displayName = getDisplayName(user)

  const handleUpdate = async (data: UserUpdateFormData) => {
    await updateProfile.mutateAsync(data)
  }

  const handleChangePassword = async () => {
    if (!actualPassword || !newPassword) return
    const payload: UserCredentialsFormData = { actualPassword, newPassword }
    await changePassword.mutateAsync(payload)
    setPasswordModalOpen(false)
    setActualPassword('')
    setNewPassword('')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-2xl lg:pb-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <User className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">{displayName}</p>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
              <User className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xl font-bold tracking-tight truncate">{displayName}</p>
              {user.email && (
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {user.profile?.label && (
                  <Badge variant="outline">{user.profile.label}</Badge>
                )}
                {user.personType && (
                  <Badge variant="secondary">
                    {PERSON_TYPE_LABELS[user.personType as PersonType] ?? user.personType}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </span>
            Compte
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {user.email && <InfoRow icon={Mail} label="Email" value={user.email} href={`mailto:${user.email}`} />}
          {user.phone && (
            <InfoRow icon={Phone} label="Téléphone" value={user.phone} href={`tel:${user.phone}`} />
          )}
          {issuingOfficeName && (
            <InfoRow icon={Building2} label="Bureau d'émission" value={issuingOfficeName} />
          )}
          <div className="flex flex-wrap gap-2 pt-3">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary" className="font-normal">
                {ROLE_LABELS[role as Role] ?? role}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <UserEditForm
        defaultValues={{
          email: user.email ?? '',
          phone: user.phone ?? '',
          displayName: user.displayName ?? displayName,
        }}
        onSubmit={handleUpdate}
        isLoading={updateProfile.isPending}
        submitLabel="Enregistrer"
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
        <CardContent className="space-y-3 pt-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl sm:w-auto"
            onClick={() => setPasswordModalOpen(true)}
          >
            Changer le mot de passe
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full rounded-xl sm:w-auto"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
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
              disabled={!actualPassword || !newPassword || changePassword.isPending}
            >
              {changePassword.isPending ? 'Confirmation...' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
