import { useState } from 'react'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { loginSchema, type LoginFormData } from '@/schemas/auth.schema'
import { useAuth } from '@/hooks/useAuth'
import { getHomeRouteForUser } from '@/lib/auth-routing'
import { extractApiErrorMessage } from '@/services/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { HydraError } from '@/types/hydra'

const fieldClass =
  'h-12 rounded-xl border-border/60 bg-muted/40 pl-10 text-base focus-visible:border-input focus-visible:bg-background focus-visible:ring-brand-orange/30 sm:text-sm'

function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError<HydraError>(error)) {
    return extractApiErrorMessage(error.response?.data, error.response?.status)
  }
  return 'Identifiants incorrects. Vérifiez votre email ou téléphone.'
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const redirectFrom = (location.state as { from?: { pathname: string } })?.from?.pathname

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const user = await login(data)
      const destination =
        redirectFrom && redirectFrom !== '/login' ? redirectFrom : getHomeRouteForUser(user)
      void navigate(destination, { replace: true })
    } catch (error) {
      toast.error(getLoginErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl shadow-black/20">
      <div className="border-b border-border/60 bg-muted/30 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <LogIn className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Connexion</h1>
            <p className="text-sm text-muted-foreground">Email ou téléphone et mot de passe</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-5 sm:p-6">
        <div className="space-y-1.5">
          <label htmlFor="identifier" className="text-sm font-medium text-foreground">
            Email ou téléphone
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="email@exemple.com ou +243…"
              className={fieldClass}
              aria-invalid={!!errors.identifier}
              {...register('identifier')}
            />
          </div>
          {errors.identifier?.message && (
            <p className="text-sm text-destructive" role="alert">
              {errors.identifier.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn(fieldClass, 'pr-12')}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password?.message && (
            <p className="text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-xl bg-brand-orange text-base font-semibold text-white shadow-lg shadow-brand-orange/25 hover:bg-brand-orange/90"
        >
          {isLoading ? (
            <>
              <LoaderIcon />
              Connexion…
            </>
          ) : (
            'Se connecter'
          )}
        </Button>
      </form>
    </div>
  )
}
