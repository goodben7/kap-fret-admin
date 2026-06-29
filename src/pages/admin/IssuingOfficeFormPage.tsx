import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useIssuingOffice, useCreateIssuingOffice, useUpdateIssuingOffice } from '@/hooks/useIssuingOffices'
import { IssuingOfficeForm } from '@/components/forms/IssuingOfficeForm'
import { issuingOfficeToFormDefaults, toIssuingOfficeCreatePayload, toIssuingOfficePatchPayload } from '@/lib/issuing-office'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { IssuingOfficeFormData } from '@/schemas/issuing-office.schema'

export function IssuingOfficeFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const officeId = id ?? ''

  const { data: office, isLoading } = useIssuingOffice(isEdit ? officeId : '')
  const createOffice = useCreateIssuingOffice()
  const updateOffice = useUpdateIssuingOffice()

  const defaultValues = office ? issuingOfficeToFormDefaults(office) : undefined
  const isPending = createOffice.isPending || updateOffice.isPending
  const showLoader = isEdit && isLoading

  const handleSubmit = async (data: IssuingOfficeFormData) => {
    if (isEdit) {
      await updateOffice.mutateAsync({ id: officeId, payload: toIssuingOfficePatchPayload(data) })
    } else {
      await createOffice.mutateAsync(toIssuingOfficeCreatePayload(data))
    }
    void navigate('/admin/issuing-offices')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/issuing-offices"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Bureaux d'émission
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Modifier le bureau' : 'Nouveau bureau d\'émission'}
          </h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          {isEdit
            ? (office?.name ?? 'Mettre à jour les informations du bureau')
            : 'Renseignez le code, le checkpoint et les coordonnées. La devise par défaut pourra être définie après la création.'}
        </p>
      </div>

      {showLoader ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Chargement du bureau..." />
        </div>
      ) : (
        <IssuingOfficeForm
          key={isEdit ? officeId : 'new'}
          isEdit={isEdit}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={isPending}
          submitLabel={isEdit ? 'Enregistrer les modifications' : 'Créer le bureau'}
          cancelHref="/admin/issuing-offices"
        />
      )}
    </div>
  )
}
