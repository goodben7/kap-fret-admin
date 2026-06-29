import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuth } from '@/hooks/useAuth'
import { hasRole, ROLES, type Role } from '@/constants/roles'

interface ProtectedRouteProps {
  roles?: Role[]
  requireIssuingOffice?: boolean
}

export function ProtectedRoute({ roles, requireIssuingOffice = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasIssuingOffice } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <LoadingSpinner size="lg" label="Chargement de l'application…" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && user && !hasRole(user.roles, roles)) {
    return <Navigate to="/unauthorized" replace />
  }

  const isSuperAdminUser = user && hasRole(user.roles, [ROLES.SPADM])

  if (requireIssuingOffice && !hasIssuingOffice && !isSuperAdminUser) {
    return <Navigate to="/no-issuing-office" replace />
  }

  return <Outlet />
}
