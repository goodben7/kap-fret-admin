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
  getTicketIssuingOfficeLabel,
  getTicketPaidAmount,
  getTicketRemainingAmount,
  getTicketTotalAmount,
} from '@/lib/ticket'
import {
  createThermalDoc,
  finalizeThermalDoc,
  thermalBrandHeader,
  thermalFooter,
  thermalLine,
  thermalPair,
  thermalTotal,
} from '@/lib/thermal-receipt-pdf'
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils'
import type { Ticket } from '@/types/ticket'

/** Reçu billet format thermique 80 mm. */
export function downloadTicketThermalReceiptPdf(ticket: Ticket): void {
  const ctx = createThermalDoc(200)
  const currency = normalizeCurrency(ticket.currency ?? CURRENCY.USD)
  const money = (amount: number) => formatMoney(amount, currency)

  thermalBrandHeader(ctx, 'Reçu billet — 80 mm')
  thermalLine(ctx, 'N° billet', ticket.ticketNumber, true)
  thermalLine(ctx, 'Statut', TICKET_STATUS_LABELS[ticket.status] ?? ticket.status)
  thermalLine(ctx, 'Passager', ticket.passengerName)
  if (ticket.category) {
    thermalLine(ctx, 'Catégorie', TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category)
  }
  thermalLine(ctx, 'Sexe', GENDER_LABELS[ticket.gender] ?? ticket.gender)
  if (ticket.phone) thermalLine(ctx, 'Téléphone', ticket.phone)
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
  ctx.doc.setFontSize(5)
  ctx.doc.text(`Généré ${formatDateTime(new Date().toISOString())} — ${BRAND.name}`, ctx.marginX, ctx.y)

  const safe = ticket.ticketNumber.replace(/[^\w.-]+/g, '_')
  finalizeThermalDoc(ctx, `recu-billet-80mm-${safe}.pdf`)
}
