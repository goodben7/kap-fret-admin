import { Badge } from '@/components/ui/badge'
import { FREIGHT_STATUS } from '@/constants/freight'
import {
  getFreightStorageBillableDays,
  getFreightStorageFees,
  isFreightEligibleForLiquidation,
  isFreightPaymentOverdue,
  isFreightPickupOverdue,
} from '@/constants/freight-business-rules'
import { cn } from '@/lib/utils'
import type { FreightShipment } from '@/types/freight-shipment'

export function FreightOverdueBadges({
  shipment,
  className,
}: {
  shipment: FreightShipment
  className?: string
}) {
  const paymentOverdue = isFreightPaymentOverdue(shipment)
  const pickupOverdue = isFreightPickupOverdue(shipment)
  const storageDays = getFreightStorageBillableDays(shipment)
  const storageFees = getFreightStorageFees(shipment)
  const eligibleLiquidation = isFreightEligibleForLiquidation(shipment)
  const isPendingLiquidation = shipment.status === FREIGHT_STATUS.PENDING_LIQUIDATION

  if (
    !paymentOverdue
    && !pickupOverdue
    && storageDays <= 0
    && !eligibleLiquidation
    && !isPendingLiquidation
  ) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {paymentOverdue && (
        <Badge variant="destructive" className="shrink-0">
          Retard paiement
        </Badge>
      )}
      {pickupOverdue && (
        <Badge
          variant="outline"
          className="shrink-0 border-destructive/40 text-destructive"
        >
          Retard enlèvement
        </Badge>
      )}
      {storageDays > 0 && (
        <Badge
          variant="outline"
          className="shrink-0 border-brand-orange/40 text-brand-orange"
          title={`Frais estimés : ${storageFees.toFixed(2)}`}
        >
          Entreposage {storageDays} j
        </Badge>
      )}
      {(isPendingLiquidation || eligibleLiquidation) && (
        <Badge variant="destructive" className="shrink-0">
          {isPendingLiquidation ? 'À liquider' : 'Liquidation J+15'}
        </Badge>
      )}
    </div>
  )
}
