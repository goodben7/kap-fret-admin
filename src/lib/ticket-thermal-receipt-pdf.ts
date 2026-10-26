import { BRAND } from '@/constants/brand'
import {
  CURRENCY,
  GENDER_LABELS,
  PAYMENT_MODE_LABELS,
  TICKET_STATUS_LABELS,
  TRIP_LEG_LABELS,
  TRIP_TYPE,
  TRIP_TYPE_LABELS,
  normalizeCurrency,
} from '@/constants/ticket'
import { getCheckpointDisplayName } from '@/lib/checkpoint'
import { PASSENGER_CONDITIONS_SHORT_NOTICE } from '@/lib/passenger-contract-conditions-pdf'
import {
  getTicketIssuingOfficeLabel,
  getTicketPaidAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
  getTicketTripLeg,
  isRoundTripTicket,
} from '@/lib/ticket'
import { downloadBlob, printJsPdf } from '@/lib/passenger-manifest-pdf'
import {
  buildThermalDocBlob,
  createThermalDoc,
  type ThermalDoc,
  thermalBrandHeader,
  thermalFooter,
  thermalLine,
  thermalPair,
  thermalTotal,
} from '@/lib/thermal-receipt-pdf'
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils'
import type { Ticket } from '@/types/ticket'

/** Reçu billet format thermique 80 mm. */
export function buildTicketThermalReceiptPdfDoc(ticket: Ticket): ThermalDoc {
  const ctx = createThermalDoc(200)
  const currency = normalizeCurrency(ticket.currency ?? CURRENCY.USD)
  const money = (amount: number) => formatMoney(amount, currency)

  thermalBrandHeader(ctx, 'Reçu billet — 80 mm')
  thermalLine(ctx, 'N° billet', ticket.ticketNumber, true)
  thermalLine(ctx, 'Statut', TICKET_STATUS_LABELS[ticket.status] ?? ticket.status)
  thermalLine(ctx, 'Passager', ticket.passengerName)
  if (ticket.category) {
    thermalLine(ctx, 'Catégorie', ticket.category)
  }
  thermalLine(ctx, 'Sexe', GENDER_LABELS[ticket.gender] ?? ticket.gender)
  if (ticket.phone) thermalLine(ctx, 'Téléphone', ticket.phone)
  if (isRoundTripTicket(ticket)) {
    thermalLine(
      ctx,
      'Voyage',
      `${TRIP_TYPE_LABELS[TRIP_TYPE.ROUND_TRIP]} — ${TRIP_LEG_LABELS[getTicketTripLeg(ticket)]}`,
    )
  }
  thermalLine(ctx, 'Départ', getCheckpointDisplayName(ticket.departure))
  thermalLine(ctx, 'Destination', getCheckpointDisplayName(ticket.destination))
  thermalLine(ctx, 'Vol', `${formatDate(ticket.travelDate)} · ${ticket.travelTime}`)
  thermalLine(ctx, 'Bureau', getTicketIssuingOfficeLabel(ticket))
  thermalLine(ctx, 'Mode', PAYMENT_MODE_LABELS[ticket.paymentMode] ?? ticket.paymentMode)
  if (ticket.sponsor?.trim()) {
    thermalLine(ctx, 'Consignataire', ticket.sponsor.trim())
  }

  ctx.y += 1
  thermalPair(ctx, 'Prix de base', money(parseFloat(ticket.basePrice) || 0))
  thermalPair(ctx, 'TVA', money(parseFloat(ticket.tva) || 0))
  thermalPair(ctx, 'FPT', money(parseFloat(ticket.fpt) || 0))
  thermalPair(ctx, 'RVA', money(parseFloat(ticket.rva) || 0))
  thermalPair(ctx, 'Payé', money(getTicketPaidAmount(ticket)))
  const remaining = getTicketRemainingAmount(ticket)
  if (remaining > 0.001) thermalPair(ctx, 'Reste', money(remaining))
  thermalTotal(ctx, 'TOTAL', money(getTicketTotalAmount(ticket)))

  thermalFooter(ctx)
  ctx.doc.setFont('helvetica', 'normal')
  ctx.doc.setFontSize(5)
  ctx.doc.setTextColor(80, 80, 80)
  const noticeLines = ctx.doc.splitTextToSize(PASSENGER_CONDITIONS_SHORT_NOTICE, ctx.contentWidth)
  ctx.doc.text(noticeLines, ctx.marginX, ctx.y)
  ctx.y += noticeLines.length * 2.4 + 2
  ctx.doc.setTextColor(0, 0, 0)
  ctx.doc.setFontSize(5)
  ctx.doc.text(`Généré ${formatDateTime(new Date().toISOString())} — ${BRAND.name}`, ctx.marginX, ctx.y)

  return ctx
}

export function buildTicketThermalReceiptPdfBlob(ticket: Ticket): Blob {
  return buildThermalDocBlob(buildTicketThermalReceiptPdfDoc(ticket))
}

export function downloadTicketThermalReceiptPdf(ticket: Ticket): void {
  const safe = ticket.ticketNumber.replace(/[^\w.-]+/g, '_')
  downloadBlob(buildTicketThermalReceiptPdfBlob(ticket), `recu-billet-80mm-${safe}.pdf`)
}

export function printTicketThermalReceiptPdf(ticket: Ticket): void {
  printJsPdf(buildTicketThermalReceiptPdfDoc(ticket).doc)
}
