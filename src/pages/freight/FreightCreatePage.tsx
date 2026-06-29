import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import { useCreateFreightShipment } from '@/hooks/useFreight'
import { FreightShipmentForm } from '@/components/forms/FreightShipmentForm'
import { toFreightCreatePayload } from '@/lib/freight'
import type { FreightShipmentFormData } from '@/schemas/freight.schema'

export function FreightCreatePage() {
  const navigate = useNavigate()
  const createShipment = useCreateFreightShipment()

  const handleSubmit = async (data: FreightShipmentFormData) => {
    const shipment = await createShipment.mutateAsync(toFreightCreatePayload(data))
    void navigate(`/freight/${shipment.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/freight"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Fret
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle expédition</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          Renseignez les informations de l'expédition fret
        </p>
      </div>

      <FreightShipmentForm
        onSubmit={handleSubmit}
        isLoading={createShipment.isPending}
        submitLabel="Créer l'expédition"
        cancelHref="/freight"
      />
    </div>
  )
}
