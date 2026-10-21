import type { jsPDF } from 'jspdf'
import {
  FREIGHT_TRANSPORT_CONDITIONS,
  FREIGHT_TRANSPORT_CONDITIONS_TITLE,
} from '@/constants/freight-transport-conditions'

export const FREIGHT_CONDITIONS_SHORT_NOTICE =
  'Conditions générales de transport : voir LTA / dépôt de destination.'

interface DrawFreightTransportConditionsParams {
  doc: jsPDF
  /** Position Y de départ (mm). */
  startY: number
  marginX?: number
  /** Largeur utile du texte (mm). */
  contentWidth?: number
  /** Marge basse minimale avant bas de page (mm). */
  bottomMargin?: number
  fontSize?: number
}

/**
 * Dessine le bloc conditions générales fret (pied LTA A4).
 * Ajoute une page 2 si le contenu ne tient pas sous startY.
 * @returns Y final après le bloc
 */
export function drawFreightTransportConditions({
  doc,
  startY,
  marginX = 16,
  contentWidth = 178,
  bottomMargin = 12,
  fontSize = 5.5,
}: DrawFreightTransportConditionsParams): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  const lineHeight = fontSize * 0.42
  let y = startY

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm <= pageHeight - bottomMargin) return
    doc.addPage()
    y = 16
  }

  ensureSpace(10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(40, 40, 40)
  doc.text(FREIGHT_TRANSPORT_CONDITIONS_TITLE, marginX + contentWidth / 2, y, {
    align: 'center',
  })
  y += 4

  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.2)
  doc.line(marginX, y, marginX + contentWidth, y)
  y += 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(50, 50, 50)

  FREIGHT_TRANSPORT_CONDITIONS.forEach((condition, index) => {
    const prefix = `${index + 1}. `
    const wrapped = doc.splitTextToSize(`${prefix}${condition}`, contentWidth) as string[]
    const blockHeight = wrapped.length * lineHeight + 1.2
    ensureSpace(blockHeight)
    doc.text(wrapped, marginX, y)
    y += blockHeight
  })

  return y
}
