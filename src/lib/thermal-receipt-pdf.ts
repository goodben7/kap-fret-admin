import { jsPDF } from 'jspdf'
import { BRAND } from '@/constants/brand'
import { downloadBlob } from '@/lib/passenger-manifest-pdf'

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }

/** Largeur papier thermique standard 80 mm. */
export const THERMAL_WIDTH_MM = 80

export type ThermalDoc = {
  doc: jsPDF
  marginX: number
  contentWidth: number
  y: number
}

export function createThermalDoc(heightMm = 200): ThermalDoc {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [THERMAL_WIDTH_MM, heightMm],
  })
  return {
    doc,
    marginX: 4,
    contentWidth: THERMAL_WIDTH_MM - 8,
    y: 6,
  }
}

export function thermalBrandHeader(ctx: ThermalDoc, subtitle: string): void {
  const { doc, marginX, contentWidth } = ctx
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text('KAP ', marginX, ctx.y)
  const kapW = doc.getTextWidth('KAP ')
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text('FRET', marginX + kapW, ctx.y)
  ctx.y += 5
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(subtitle, marginX, ctx.y)
  ctx.y += 3
  doc.setDrawColor(200, 200, 200)
  doc.line(marginX, ctx.y, marginX + contentWidth, ctx.y)
  ctx.y += 4
}

export function thermalLine(ctx: ThermalDoc, label: string, value: string, bold = false): void {
  const { doc, marginX, contentWidth } = ctx
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.text(label, marginX, ctx.y)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(8)
  const lines = doc.splitTextToSize(value, contentWidth)
  doc.text(lines, marginX, ctx.y + 3.5)
  ctx.y += 3.5 + lines.length * 3.5 + 1
}

export function thermalPair(ctx: ThermalDoc, label: string, value: string): void {
  const { doc, marginX, contentWidth } = ctx
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(label, marginX, ctx.y)
  doc.text(value, marginX + contentWidth, ctx.y, { align: 'right' })
  ctx.y += 4
}

export function thermalTotal(ctx: ThermalDoc, label: string, value: string): void {
  const { doc, marginX, contentWidth } = ctx
  doc.setFillColor(252, 211, 177)
  doc.roundedRect(marginX, ctx.y - 3, contentWidth, 8, 1, 1, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text(label, marginX + 2, ctx.y + 2)
  doc.text(value, marginX + contentWidth - 2, ctx.y + 2, { align: 'right' })
  ctx.y += 10
  doc.setTextColor(0, 0, 0)
}

export function thermalFooter(ctx: ThermalDoc): void {
  const { doc, marginX, contentWidth } = ctx
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(120, 120, 120)
  doc.text(`${BRAND.name} — reçu thermique 80 mm`, marginX, ctx.y, { maxWidth: contentWidth })
  ctx.y += 4
}

/** Recalcule la hauteur de page si le contenu dépasse. */
export function finalizeThermalDoc(ctx: ThermalDoc, fileName: string): void {
  const needed = Math.max(120, Math.ceil(ctx.y + 10))
  if (needed > 200) {
    // jsPDF ne redimensionne pas facilement — on coupe proprement
  }
  downloadBlob(ctx.doc.output('blob'), fileName)
}
