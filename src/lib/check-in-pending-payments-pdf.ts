import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import { CHECK_IN_PAYMENT_MODE_LABELS, CHECK_IN_STATUS } from '@/constants/check-in'
import { CURRENCY } from '@/constants/ticket'
import {
  getCheckInPaidAmount,
  getCheckInPassengerName,
  getCheckInPaymentMode,
  getCheckInRemainingAmount,
  getCheckInTicketNumber,
  hasCheckInOpenDebt,
  sortCheckInsByRegistrationOrder,
} from '@/lib/check-in'
import {
  fetchCheckInsForManifest,
  downloadBlob,
} from '@/lib/check-in-manifest-pdf'

export { downloadBlob, fetchCheckInsForManifest }

export interface CheckInPendingPaymentsParams {
  departureLabel: string
  destinationLabel: string
  departureCode: string
  destinationCode: string
  travelDate: string
  checkIns: CheckInPendingRowSource[]
}

type CheckInPendingRowSource = Parameters<typeof hasCheckInOpenDebt>[0] & {
  excessWeightKg?: string
  netToPay?: string
  status?: string
}

const MARGIN_X = 12
const NAVY = { r: 11, g: 33, b: 61 }

function formatMoneyCell(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '—'
  return amount
    .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[\u00A0\u202F]/g, ' ')
}

function formatDateFr(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

export function filterCheckInsWithPendingPayment(
  checkIns: CheckInPendingRowSource[],
): CheckInPendingRowSource[] {
  return checkIns.filter(
    (checkIn) =>
      checkIn.status !== CHECK_IN_STATUS.CANCELLED && hasCheckInOpenDebt(checkIn as never),
  )
}

export async function generateCheckInPendingPaymentsPdf(
  params: CheckInPendingPaymentsParams,
): Promise<Blob> {
  const pending = sortCheckInsByRegistrationOrder(
    filterCheckInsWithPendingPayment(params.checkIns) as never,
  ) as CheckInPendingRowSource[]

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(NAVY.r, NAVY.g, NAVY.b)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(BRAND.name.toUpperCase(), MARGIN_X, 12)
  doc.setFontSize(11)
  doc.text('Paiements bagages en attente', MARGIN_X, 20)

  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `${params.departureLabel} → ${params.destinationLabel}  ·  ${formatDateFr(params.travelDate)}`,
    MARGIN_X,
    36,
  )
  doc.text(
    `${pending.length} solde(s) ouvert(s)`,
    pageWidth - MARGIN_X,
    36,
    { align: 'right' },
  )

  let totalRemaining = 0
  const body = pending.map((checkIn, index) => {
    const remaining = getCheckInRemainingAmount(checkIn as never)
    totalRemaining += remaining
    const mode = getCheckInPaymentMode(checkIn as never)
    const modeLabel =
      CHECK_IN_PAYMENT_MODE_LABELS[mode as keyof typeof CHECK_IN_PAYMENT_MODE_LABELS] ?? mode
    return [
      String(index + 1),
      getCheckInPassengerName(checkIn as never) ?? '—',
      getCheckInTicketNumber(checkIn as never),
      (() => {
        const kg = parseFloat(String(checkIn.excessWeightKg ?? '')) || 0
        return kg > 0
          ? kg.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
          : '—'
      })(),
      formatMoneyCell(parseFloat(String(checkIn.netToPay ?? '')) || 0),
      formatMoneyCell(getCheckInPaidAmount(checkIn as never)),
      formatMoneyCell(remaining),
      modeLabel,
    ]
  })

  body.push([
    '',
    'TOTAL',
    '',
    '',
    '',
    '',
    formatMoneyCell(totalRemaining),
    '',
  ])

  autoTable(doc, {
    startY: 42,
    margin: { left: MARGIN_X, right: MARGIN_X },
    head: [[
      'N°',
      'Passager',
      'Billet',
      'Excédent (kg)',
      `Total (${CURRENCY.USD})`,
      `Payé (${CURRENCY.USD})`,
      `Reste (${CURRENCY.USD})`,
      'Mode',
    ]],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [60, 60, 60],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [173, 216, 230],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 32 },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
      7: { cellWidth: 40 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [245, 245, 245]
      }
    },
  })

  return doc.output('blob')
}

export function buildCheckInPendingPaymentsFileName(params: {
  departureCode: string
  destinationCode: string
  travelDate: string
}): string {
  return `SOLDES_BAGAGES_${params.departureCode}_${params.destinationCode}_${params.travelDate}.pdf`
}
