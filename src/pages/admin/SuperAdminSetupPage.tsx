import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, Rocket } from 'lucide-react'
import { IssuingOfficeForm } from '@/components/forms/IssuingOfficeForm'
import { OfficeAdminAccessModalContent } from '@/components/forms/OfficeAdminAccessModalContent'
import { useAuth } from '@/hooks/useAuth'
import { useCreateIssuingOffice, useCreateOfficeAdminAccess } from '@/hooks/useIssuingOffices'
import { usePlatformSetupStatus } from '@/hooks/usePlatformSetup'
import { isSuperAdmin } from '@/lib/auth-routing'
import { toIssuingOfficeCreatePayload } from '@/lib/issuing-office'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { IssuingOfficeFormData, OfficeAdminAccessFormData } from '@/schemas/issuing-office.schema'
import type { IssuingOffice } from '@/types/issuing-office'

type SetupStep = 'office' | 'admin'

function StepIndicator({ step }: { step: SetupStep }) {
  const steps = [
    { id: 'office' as const, label: 'Bureau d\'émission' },
    { id: 'admin' as const, label: 'Administrateur' },
  ]

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
      {steps.map((item, index) => {
        const isActive = step === item.id
        const isDone = step === 'admin' && item.id === 'office'

        return (
          <li key={item.id} className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                isDone && 'border-brand-orange bg-brand-orange text-white',
                isActive && !isDone && 'border-brand-orange bg-brand-orange/10 text-brand-orange',
                !isActive && !isDone && 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {isDone ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : index + 1}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-semibold',
                  (isActive || isDone) ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {item.id === 'office' ? 'Point de vente principal' : 'Compte ADM du bureau'}
              </p>
            </div>
            {index < steps.length - 1 && (
              <span className="hidden h-px w-8 bg-border sm:block" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function SuperAdminSetupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isLoading, needsOffice, officePendingAdmin, isComplete } = usePlatformSetupStatus()
  const createOffice = useCreateIssuingOffice()
  const createAdmin = useCreateOfficeAdminAccess()

  const [step, setStep] = useState<SetupStep>('office')
  const [createdOffice, setCreatedOffice] = useState<IssuingOffice | null>(null)

  const activeOffice = createdOffice ?? officePendingAdmin

  useEffect(() => {
    if (isLoading) return
    if (needsOffice) {
      setStep('office')
      return
    }
    if (officePendingAdmin) {
      setStep('admin')
    }
  }, [isLoading, needsOffice, officePendingAdmin])

  if (!isSuperAdmin(user)) {
    return <Navigate to="/admin" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Vérification de la plateforme..." />
      </div>
    )
  }

  if (isComplete) {
    return <Navigate to="/admin" replace />
  }

  const handleOfficeSubmit = async (data: IssuingOfficeFormData) => {
    const office = await createOffice.mutateAsync(toIssuingOfficeCreatePayload(data))
    setCreatedOffice(office)
    setStep('admin')
  }

  const handleAdminSubmit = async (data: OfficeAdminAccessFormData) => {
    if (!activeOffice) return
    await createAdmin.mutateAsync({
      officeId: activeOffice.id,
      payload: {
        ...data,
        holderId: activeOffice.id,
        holderType: 'ISSUING_OFFICE',
      },
    })
    void navigate('/admin', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-44 lg:max-w-4xl lg:pb-6">
      <div className="space-y-4 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange">
          <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
          Configuration initiale
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Bienvenue sur KAP FRET</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            En tant que Super Admin, commencez par créer le premier bureau d&apos;émission puis
            l&apos;administrateur qui gérera ce bureau au quotidien.
          </p>
        </div>
      </div>

      <StepIndicator step={step} />

      {step === 'office' && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <IssuingOfficeForm
              onSubmit={handleOfficeSubmit}
              isLoading={createOffice.isPending}
              submitLabel="Créer le bureau et continuer"
              cancelHref={undefined}
            />
          </CardContent>
        </Card>
      )}

      {step === 'admin' && activeOffice && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <OfficeAdminAccessModalContent
              office={activeOffice}
              onSubmit={handleAdminSubmit}
              onCancel={() => {
                if (needsOffice || createdOffice) {
                  setStep('office')
                } else {
                  void navigate('/admin/issuing-offices')
                }
              }}
              isLoading={createAdmin.isPending}
            />
          </CardContent>
        </Card>
      )}

      {step === 'admin' && !activeOffice && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun bureau disponible. Créez d&apos;abord un bureau d&apos;émission.
          </p>
          <Button type="button" onClick={() => setStep('office')}>
            Retour à l&apos;étape 1
          </Button>
        </div>
      )}
    </div>
  )
}
