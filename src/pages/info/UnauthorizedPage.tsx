import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <Logo variant="card" linkTo="/dashboard" />
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <ShieldX className="mx-auto h-12 w-12 text-destructive mb-2" />
          <CardTitle>Accès refusé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <Button asChild>
            <Link to="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
