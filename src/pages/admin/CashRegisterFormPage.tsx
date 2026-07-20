import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Wallet } from 'lucide-react'
import { useCashRegister, useCreateCashRegister, useUpdateCashRegister } from '@/hooks/useCashRegisters'
import { CashRegisterCreateForm, CashRegisterPatchForm } from '@/components/forms/CashRegisterForm'
import {
  cashRegisterToPatchFormDefaults,
  toCashRegisterCreatePayload,
  toCashRegisterPatchPayload,
} from '@/lib/cash-register'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { CashRegisterCreateFormData, CashRegisterPatchFormData } from '@/schemas/cash-register.schema'

export function CashRegisterFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const registerId = id ?? ''

  const { data: register, isLoading } = useCashRegister(isEdit ? registerId : '')
  const createRegister = useCreateCashRegister()
  const updateRegister = useUpdateCashRegister()

  const showLoader = isEdit && isLoading
  const isPending = createRegister.isPending || updateRegister.isPending

  const handleCreate = async (data: CashRegisterCreateFormData) => {
    const created = await createRegister.mutateAsync(toCashRegisterCreatePayload(data))
    void navigate(`/admin/cash-registers/${created.id}`)
  }

  const handlePatch = async (data: CashRegisterPatchFormData) => {
    await updateRegister.mutateAsync({ id: registerId, payload: toCashRegisterPatchPayload(data) })
    void navigate(`/admin/cash-registers/${registerId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to={isEdit ? `/admin/cash-registers/${registerId}` : '/admin/cash-registers'}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isEdit ? 'Détail' : 'Mouvements Financiers'}
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Modifier le registre' : 'Nouveau registre'}
          </h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          {isEdit
            ? (register?.name ?? 'Mettre à jour le code, le nom et le statut')
            : 'Définissez le registre, ses soldes d\'ouverture USD et CDF'}
        </p>
      </div>

      {showLoader ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement..." />
        </div>
      ) : isEdit && register ? (
        <CashRegisterPatchForm
          key={registerId}
          defaultValues={cashRegisterToPatchFormDefaults(register)}
          onSubmit={handlePatch}
          isLoading={isPending}
          cancelHref={`/admin/cash-registers/${registerId}`}
        />
      ) : !isEdit ? (
        <CashRegisterCreateForm onSubmit={handleCreate} isLoading={isPending} />
      ) : null}
    </div>
  )
}
