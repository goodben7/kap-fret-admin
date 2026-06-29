import { AlertTriangle, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/auth-routing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export function NoIssuingOfficePage() {
  const { logout, user } = useAuth()
  const superAdmin = isSuperAdmin(user)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <Logo variant="card" />
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-2" />
          <CardTitle>Accès non autorisé</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {superAdmin
              ? 'Votre compte Super Admin n\'est pas rattaché à un bureau d\'émission. Utilisez l\'administration pour configurer la plateforme.'
              : `Votre compte (${user?.firstName} ${user?.lastName}) n'est pas rattaché à un Bureau d'Émission. Veuillez contacter votre administrateur.`}
          </p>
          {!superAdmin && (
            <p className="text-sm text-muted-foreground">
              Type de rattachement actuel : <strong>{user?.holderType ?? 'Non défini'}</strong>
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {superAdmin && (
              <Button asChild>
                <Link to="/admin/setup">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuration plateforme
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={logout}>
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
