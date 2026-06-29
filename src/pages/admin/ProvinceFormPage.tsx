import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Map } from 'lucide-react'
import { useProvince, useCreateProvince, useUpdateProvince } from '@/hooks/useProvinces'
import { ProvinceForm } from '@/components/forms/ProvinceForm'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { ProvinceFormData } from '@/schemas/province.schema'

export function ProvinceFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const provinceId = id ?? ''

  const { data: province, isLoading } = useProvince(isEdit ? provinceId : '')
  const createProvince = useCreateProvince()
  const updateProvince = useUpdateProvince()

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement de la province..." />
      </div>
    )
  }

  const defaultValues: Partial<ProvinceFormData> | undefined = province
    ? {
        label: province.label,
        code: province.code,
        active: province.active,
      }
    : undefined

  const handleSubmit = async (data: ProvinceFormData) => {
    if (isEdit) {
      await updateProvince.mutateAsync({ id: provinceId, payload: data })
    } else {
      await createProvince.mutateAsync(data)
    }
    void navigate('/admin/provinces')
  }

  const isPending = createProvince.isPending || updateProvince.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/provinces"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Provinces
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Map className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Modifier la province' : 'Nouvelle province'}
          </h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          {isEdit
            ? (province?.label ?? 'Mettre à jour le libellé et le code')
            : 'Définissez une zone géographique pour les checkpoints'}
        </p>
      </div>

      <ProvinceForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel={isEdit ? 'Enregistrer les modifications' : 'Créer la province'}
        cancelHref="/admin/provinces"
      />
    </div>
  )
}
