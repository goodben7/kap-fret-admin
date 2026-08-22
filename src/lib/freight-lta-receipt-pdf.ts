import { jsPDF } from 'jspdf'
import { BRAND } from '@/constants/brand'
import { FREIGHT_PAYMENT_MODE_LABELS, FREIGHT_STATUS_LABELS } from '@/constants/freight'
import { CURRENCY, normalizeCurrency } from '@/constants/ticket'
import { formatFreightWeight, getFreightIssuingOfficeLabel } from '@/lib/freight'
import { downloadBlob } from '@/lib/passenger-manifest-pdf'
import { formatDateTime, formatMoney } from '@/lib/utils'
import type { FreightShipment } from '@/types/freight-shipment'

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }

function money(value: string | number, currency: string) {
  const amount = typeof value === 'number' ? value : parseFloat(value) || 0
  return formatMoney(amount, normalizeCurrency(currency))
}

export function buildFreightLtaReceiptWhatsAppText(shipment: FreightShipment): string {
  const currency = normalizeCurrency(shipment.currency)
  const remaining = parseFloat(shipment.remainingAmount) || 0
  const lines = [
    `Bonjour,`,
    ``,
    `Reçu LTA ${shipment.ltaNumber}`,
    `Expéditeur : ${shipment.senderName}`,
    `Destinataire : ${shipment.receiverName}`,
    `Colis : ${shipment.packageCount} · Poids : ${formatFreightWeight(shipment.totalWeight)}`,
    `Total : ${money(shipment.totalAmount, currency)}`,
    `Payé : ${money(shipment.paidAmount, currency)}`,
    remaining > 0 ? `Reste : ${money(shipment.remainingAmount, currency)}` : null,
    `Mode : ${FREIGHT_PAYMENT_MODE_LABELS[shipment.paymentMode] ?? shipment.paymentMode}`,
    ``,
    `${BRAND.name}`,
  ]
  return lines.filter((line) => line != null).join('\n')
}

export function downloadFreightLtaReceiptPdf(shipment: FreightShipment): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const marginX = 16
  let y = 18
  const currency = normalizeCurrency(shipment.currency)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text('KAP ', marginX, y)
  const kapW = doc.getTextWidth('KAP ')
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text('FRET', marginX + kapW, y)
  y += 8

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.text('Reçu / Facture LTA', marginX, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`N° LTA : ${shipment.ltaNumber}`, marginX, y)
  y += 6
  doc.text(`Date : ${formatDateTime(shipment.shipmentDate)}`, marginX, y)
  y += 6
  doc.text(`Statut : ${FREIGHT_STATUS_LABELS[shipment.status] ?? shipment.status}`, marginX, y)
  y += 6
  doc.text(`Bureau : ${getFreightIssuingOfficeLabel(shipment)}`, marginX, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Expéditeur', marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(shipment.senderName, marginX, y)
  y += 5
  doc.text(shipment.senderAddress || '—', marginX, y, { maxWidth: 178 })
  y += 8
  doc.text(`Tél. : ${shipment.senderPhone || '—'}`, marginX, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Destinataire', marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(shipment.receiverName, marginX, y)
  y += 5
  doc.text(shipment.receiverAddress || '—', marginX, y, { maxWidth: 178 })
  y += 8
  doc.text(`Tél. : ${shipment.receiverPhone || '—'}`, marginX, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Marchandise', marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`Colis : ${shipment.packageCount}`, marginX, y)
  y += 5
  doc.text(`Poids total : ${formatFreightWeight(shipment.totalWeight)}`, marginX, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Tarification', marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const rows: [string, string][] = [
    ['Fret ordinaire', money(shipment.ordinaryFreight, currency)],
    ['Fret volume', money(shipment.volumeFreight, currency)],
    ['RVA', money(shipment.rva, currency)],
    ['Frais LTA', money(shipment.ltaFees, currency)],
    ['Mode de paiement', FREIGHT_PAYMENT_MODE_LABELS[shipment.paymentMode] ?? shipment.paymentMode],
    ['Payé', money(shipment.paidAmount, currency)],
    ['Reste', money(shipment.remainingAmount, currency)],
  ]
  for (const [label, value] of rows) {
    doc.text(label, marginX, y)
    doc.text(value, 194, y, { align: 'right' })
    y += 6
  }

  y += 4
  doc.setFillColor(252, 211, 177)
  doc.roundedRect(marginX, y - 5, 178, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text('TOTAL', marginX + 4, y + 3)
  doc.text(money(shipment.totalAmount, currency), 190, y + 3, { align: 'right' })
  y += 16

  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (shipment.observations?.trim()) {
    doc.text(`Observations : ${shipment.observations.trim()}`, marginX, y, { maxWidth: 178 })
    y += 10
  }
  doc.text(`Document généré le ${formatDateTime(new Date().toISOString())} — ${BRAND.name}`, marginX, y)

  const safeLta = shipment.ltaNumber.replace(/[^\w.-]+/g, '_')
  downloadBlob(doc.output('blob'), `recu-lta-${safeLta}.pdf`)
}
