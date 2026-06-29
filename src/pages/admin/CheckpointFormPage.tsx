import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useCheckpoint, useCreateCheckpoint, useUpdateCheckpoint } from '@/hooks/useCheckpoints'
import { CheckpointForm, resolveProvinceValue } from '@/components/forms/CheckpointForm'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { CheckpointFormData } from '@/schemas/checkpoint.schema'

export function CheckpointFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const checkpointId = id ?? ''

  const { data: checkpoint, isLoading } = useCheckpoint(isEdit ? checkpointId : '')
  const createCheckpoint = useCreateCheckpoint()
  const updateCheckpoint = useUpdateCheckpoint()

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement du checkpoint..." />
      </div>
    )
  }

  const defaultValues: Partial<CheckpointFormData> | undefined = checkpoint
    ? {
        label: checkpoint.label,
        active: checkpoint.active,
        latitude: checkpoint.latitude,
        longitude: checkpoint.longitude,
        province: resolveProvinceValue(checkpoint.province),
      }
    : undefined

  const handleSubmit = async (data: CheckpointFormData) => {
    if (isEdit) {
      await updateCheckpoint.mutateAsync({ id: checkpointId, payload: data })
    } else {
      await createCheckpoint.mutateAsync(data)
    }
    void navigate('/admin/checkpoints')
  }

  const isPending = createCheckpoint.isPending || updateCheckpoint.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/checkpoints"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Checkpoints
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Modifier le checkpoint' : 'Nouveau checkpoint'}
          </h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          {isEdit
            ? (checkpoint?.label ?? 'Mettre à jour le libellé et la localisation')
            : 'Renseignez le nom, la province et les coordonnées GPS'}
        </p>
      </div>

      <CheckpointForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel={isEdit ? 'Enregistrer les modifications' : 'Créer le checkpoint'}
        cancelHref="/admin/checkpoints"
      />
    </div>
  )
}
