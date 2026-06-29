import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import { useFreightShipment, useUpdateFreightShipment } from '@/hooks/useFreight'
import { FreightShipmentPatchForm } from '@/components/forms/FreightShipmentPatchForm'
import { shipmentToPatchFormDefaults, toFreightPatchPayload } from '@/lib/freight'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { FreightShipmentPatchFormData } from '@/schemas/freight.schema'

export function FreightEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const shipmentId = id ?? ''
  const { data: shipment, isLoading } = useFreightShipment(shipmentId)
  const updateShipment = useUpdateFreightShipment()

  if (isLoading) return <LoadingSpinner />
  if (!shipment) return <p>Expédition introuvable</p>

  const handleSubmit = async (data: FreightShipmentPatchFormData) => {
    await updateShipment.mutateAsync({ id: shipmentId, payload: toFreightPatchPayload(data) })
    void navigate(`/freight/${shipmentId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to={`/freight/${shipmentId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour au détail
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Modifier l'expédition</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">{shipment.ltaNumber}</p>
      </div>

      <FreightShipmentPatchForm
        defaultValues={shipmentToPatchFormDefaults(shipment)}
        onSubmit={handleSubmit}
        isLoading={updateShipment.isPending}
        cancelHref={`/freight/${shipmentId}`}
      />
    </div>
  )
}
