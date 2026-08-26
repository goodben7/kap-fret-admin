import { BRAND } from '@/constants/brand'
import { FREIGHT_PAYMENT_MODE_LABELS, FREIGHT_STATUS_LABELS } from '@/constants/freight'
import { normalizeCurrency } from '@/constants/ticket'
import { formatFreightWeight, getFreightIssuingOfficeLabel } from '@/lib/freight'
import {
  createThermalDoc,
  finalizeThermalDoc,
  thermalBrandHeader,
  thermalFooter,
  thermalLine,
  thermalPair,
  thermalTotal,
} from '@/lib/thermal-receipt-pdf'
import { formatDateTime, formatMoney } from '@/lib/utils'
import type { FreightShipment } from '@/types/freight-shipment'

function money(value: string | number, currency: string) {
  const amount = typeof value === 'number' ? value : parseFloat(value) || 0
  return formatMoney(amount, normalizeCurrency(currency))
}

/** Reçu LTA format thermique 80 mm. */
export function downloadFreightLtaThermalReceiptPdf(shipment: FreightShipment): void {
  const ctx = createThermalDoc(220)
  const currency = normalizeCurrency(shipment.currency)

  thermalBrandHeader(ctx, 'Reçu LTA — 80 mm')
  thermalLine(ctx, 'N° LTA', shipment.ltaNumber, true)
  thermalLine(ctx, 'Date', formatDateTime(shipment.shipmentDate))
  thermalLine(ctx, 'Statut', FREIGHT_STATUS_LABELS[shipment.status] ?? shipment.status)
  thermalLine(ctx, 'Bureau', getFreightIssuingOfficeLabel(shipment))
  thermalLine(ctx, 'Expéditeur', shipment.senderName)
  if (shipment.senderPhone) thermalLine(ctx, 'Tél. exp.', shipment.senderPhone)
  thermalLine(ctx, 'Consignataire', shipment.receiverName)
  if (shipment.receiverPhone) thermalLine(ctx, 'Tél. dest.', shipment.receiverPhone)
  thermalLine(ctx, 'Colis / poids', `${shipment.packageCount} · ${formatFreightWeight(shipment.totalWeight)}`)

  ctx.y += 1
  thermalPair(ctx, 'Fret ordinaire', money(shipment.ordinaryFreight, currency))
  thermalPair(ctx, 'Fret volume', money(shipment.volumeFreight, currency))
  thermalPair(ctx, 'RVA', money(shipment.rva, currency))
  thermalPair(ctx, 'Frais LTA', money(shipment.ltaFees, currency))
  thermalPair(ctx, 'Mode', FREIGHT_PAYMENT_MODE_LABELS[shipment.paymentMode] ?? shipment.paymentMode)
  thermalPair(ctx, 'Payé', money(shipment.paidAmount, currency))
  const remaining = parseFloat(shipment.remainingAmount) || 0
  if (remaining > 0) thermalPair(ctx, 'Reste', money(shipment.remainingAmount, currency))
  thermalTotal(ctx, 'TOTAL', money(shipment.totalAmount, currency))

  if (shipment.observations?.trim()) {
    thermalLine(ctx, 'Observations', shipment.observations.trim())
  }
  thermalFooter(ctx)
  ctx.doc.setFontSize(5)
  ctx.doc.text(`Généré ${formatDateTime(new Date().toISOString())} — ${BRAND.name}`, ctx.marginX, ctx.y)

  const safeLta = shipment.ltaNumber.replace(/[^\w.-]+/g, '_')
  finalizeThermalDoc(ctx, `recu-lta-80mm-${safeLta}.pdf`)
}
