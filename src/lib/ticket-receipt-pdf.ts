import { jsPDF } from 'jspdf'
import { BRAND } from '@/constants/brand'
import {
  CURRENCY,
  GENDER_LABELS,
  PAYMENT_MODE_LABELS,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  normalizeCurrency,
} from '@/constants/ticket'
import { getCheckpointDisplayName } from '@/lib/checkpoint'
import {
  drawPassengerContractConditions,
  PASSENGER_CONDITIONS_SHORT_NOTICE,
} from '@/lib/passenger-contract-conditions-pdf'
import { downloadBlob } from '@/lib/passenger-manifest-pdf'
import {
  getTicketIssuingOfficeLabel,
  getTicketPaidAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
} from '@/lib/ticket'
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils'
import type { Ticket } from '@/types/ticket'

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }

function money(value: string | number, currency: string) {
  const amount = typeof value === 'number' ? value : parseFloat(String(value)) || 0
  return formatMoney(amount, normalizeCurrency(currency))
}

export function buildTicketReceiptWhatsAppText(ticket: Ticket): string {
  const currency = normalizeCurrency(ticket.currency ?? CURRENCY.USD)
  const remaining = getTicketRemainingAmount(ticket)
  const lines = [
    `Bonjour,`,
    ``,
    `Reçu billet ${ticket.ticketNumber}`,
    `Passager : ${ticket.passengerName}`,
    `Trajet : ${getCheckpointDisplayName(ticket.departure)} → ${getCheckpointDisplayName(ticket.destination)}`,
    `Vol : ${formatDate(ticket.travelDate)} · ${ticket.travelTime}`,
    `Total : ${money(getTicketTotalAmount(ticket), currency)}`,
    `Payé : ${money(getTicketPaidAmount(ticket), currency)}`,
    remaining > 0.001 ? `Reste : ${money(remaining, currency)}` : null,
    `Mode : ${PAYMENT_MODE_LABELS[ticket.paymentMode] ?? ticket.paymentMode}`,
    ``,
    PASSENGER_CONDITIONS_SHORT_NOTICE,
    ``,
    `${BRAND.name}`,
  ]
  return lines.filter((line) => line != null).join('\n')
}

/** Reçu / facture billet A4 + extraits des conditions du contrat. */
export function downloadTicketReceiptPdf(ticket: Ticket): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const marginX = 16
  let y = 18
  const currency = normalizeCurrency(ticket.currency ?? CURRENCY.USD)

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
  doc.text('Reçu / Facture billet', marginX, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`N° billet : ${ticket.ticketNumber}`, marginX, y)
  y += 6
  doc.text(`Statut : ${TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}`, marginX, y)
  y += 6
  doc.text(`Bureau : ${getTicketIssuingOfficeLabel(ticket)}`, marginX, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Passager', marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(ticket.passengerName, marginX, y)
  y += 5
  doc.text(`Sexe : ${GENDER_LABELS[ticket.gender] ?? ticket.gender}`, marginX, y)
  y += 5
  if (ticket.category) {
    doc.text(`Catégorie : ${TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}`, marginX, y)
    y += 5
  }
  if (ticket.phone) {
    doc.text(`Tél. : ${ticket.phone}`, marginX, y)
    y += 5
  }
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Voyage', marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`Départ : ${getCheckpointDisplayName(ticket.departure)}`, marginX, y)
  y += 5
  doc.text(`Destination : ${getCheckpointDisplayName(ticket.destination)}`, marginX, y)
  y += 5
  doc.text(`Date / heure : ${formatDate(ticket.travelDate)} · ${ticket.travelTime}`, marginX, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Tarification', marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const rows: [string, string][] = [
    ['Prix de base', money(ticket.basePrice, currency)],
    ['TVA', money(ticket.tva, currency)],
    ['FPT', money(ticket.fpt, currency)],
    ['RVA', money(ticket.rva, currency)],
    ['Mode de paiement', PAYMENT_MODE_LABELS[ticket.paymentMode] ?? ticket.paymentMode],
    ['Payé', money(getTicketPaidAmount(ticket), currency)],
    ['Reste', money(getTicketRemainingAmount(ticket), currency)],
  ]
  if (ticket.sponsor?.trim()) {
    rows.splice(5, 0, ['Consignataire', ticket.sponsor.trim()])
  }
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
  doc.text(money(getTicketTotalAmount(ticket), currency), 190, y + 3, { align: 'right' })
  y += 16

  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Document généré le ${formatDateTime(new Date().toISOString())} — ${BRAND.name}`, marginX, y)
  y += 8

  drawPassengerContractConditions({
    doc,
    startY: y,
    marginX,
    contentWidth: 178,
  })

  const safe = ticket.ticketNumber.replace(/[^\w.-]+/g, '_')
  downloadBlob(doc.output('blob'), `recu-billet-${safe}.pdf`)
}
