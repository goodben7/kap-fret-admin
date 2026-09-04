import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import {
  formatMoneyByCurrency,
  type FlightProfitabilityReport,
  type FlightProfitabilitySection,
} from '@/lib/flight-profitability'
import { downloadBlob } from '@/lib/passenger-manifest-pdf'

export { downloadBlob }

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }
const MARGIN_X = 14

function formatReportDate(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

async function loadImageDataUrl(src: string): Promise<string | null> {
  try {
    const response = await fetch(src)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function sectionRow(label: string, section: FlightProfitabilitySection): string[] {
  return [
    label,
    String(section.count),
    section.weightKg > 0.001
      ? `${section.weightKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`
      : '—',
    formatMoneyByCurrency(section.total),
    formatMoneyByCurrency(section.paid),
    formatMoneyByCurrency(section.remaining),
  ]
}

export async function generateFlightProfitabilityPdf(
  report: FlightProfitabilityReport,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const centerX = pageWidth / 2
  const rightX = pageWidth - MARGIN_X
  const logoDataUrl = await loadImageDataUrl(BRAND.logoSrc)

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_X, 10, 30, 18)
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  const kap = 'KAP '
  const fret = 'FRET'
  const kapW = doc.getTextWidth(kap)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  const fretW = doc.getTextWidth(fret)
  const startX = centerX - (kapW + fretW) / 2
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text(kap, startX, 20)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text(fret, startX + kapW, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`DATE DU VOL : ${formatReportDate(report.criteria.flightDate)}`, rightX, 14, {
    align: 'right',
  })
  doc.text(
    `N° DU VOL : ${report.criteria.flightNumber?.trim() || '..........'}`,
    rightX,
    20,
    { align: 'right' },
  )
  doc.text(`TRAJET : ${report.routeLabel}`, rightX, 26, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text('RAPPORT DE RENTABILITÉ VOL', centerX, 34, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(
    'Fret = LTA expédiées (SENT/ARRIVÉ/LIVRÉ) · Excédent bagages = check-in (séparé du fret)',
    centerX,
    40,
    { align: 'center' },
  )

  autoTable(doc, {
    startY: 44,
    head: [['Poste', 'Nb', 'Poids', 'Total', 'Encaissé', 'Solde']],
    body: [
      sectionRow('Billets passagers', report.tickets),
      sectionRow('Fret expédié', report.freightShipped),
      sectionRow('Excédent bagages', report.excessBaggage),
      sectionRow('TOTAL RENTABILITÉ', report.combined),
      sectionRow('Fret non expédié (PENDING)', report.freightPending),
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [252, 211, 177],
      textColor: [40, 40, 40],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 45, halign: 'right' },
      4: { cellWidth: 45, halign: 'right' },
      5: { cellWidth: 45, halign: 'right' },
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [232, 245, 233]
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.row.index === 4) {
        data.cell.styles.textColor = [120, 120, 120]
        data.cell.styles.fontStyle = 'italic'
      }
    },
  })

  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `FAIT A KINSHASA, LE ${formatReportDate(report.criteria.flightDate)}`,
    pageWidth - MARGIN_X,
    pageHeight - 18,
    { align: 'right' },
  )
  doc.setDrawColor(60, 60, 60)
  doc.setLineWidth(0.35)
  doc.line(pageWidth - MARGIN_X - 90, pageHeight - 12, pageWidth - MARGIN_X, pageHeight - 12)
  doc.setFontSize(8)
  doc.text('SIGNATURE DU RESPONSABLE.', pageWidth - MARGIN_X, pageHeight - 8, {
    align: 'right',
  })

  return doc.output('blob')
}

export function buildFlightProfitabilityFileName(report: FlightProfitabilityReport): string {
  const date = report.criteria.flightDate.replace(/-/g, '')
  const flight = report.criteria.flightNumber?.trim().replace(/\s+/g, '_') || 'VOL'
  return `RENTABILITE_${flight}_${date}.pdf`
}
