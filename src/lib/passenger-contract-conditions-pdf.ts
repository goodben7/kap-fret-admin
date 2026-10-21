import type { jsPDF } from 'jspdf'
import {
  PASSENGER_CONTRACT_CONDITIONS,
  PASSENGER_CONTRACT_CONDITIONS_TITLE,
} from '@/constants/passenger-contract-conditions'

export const PASSENGER_CONDITIONS_SHORT_NOTICE =
  'Extraits des conditions du contrat : voir reçu billet / agence.'

interface DrawPassengerContractConditionsParams {
  doc: jsPDF
  startY: number
  marginX?: number
  contentWidth?: number
  bottomMargin?: number
  fontSize?: number
}

/**
 * Dessine le bloc extraits des conditions du contrat (pied reçu billet A4).
 * Ajoute une page 2 si nécessaire.
 */
export function drawPassengerContractConditions({
  doc,
  startY,
  marginX = 16,
  contentWidth = 178,
  bottomMargin = 12,
  fontSize = 5.5,
}: DrawPassengerContractConditionsParams): number {
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
  doc.text(PASSENGER_CONTRACT_CONDITIONS_TITLE, marginX + contentWidth / 2, y, {
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

  PASSENGER_CONTRACT_CONDITIONS.forEach((condition, index) => {
    const prefix = `${index + 1}. `
    const wrapped = doc.splitTextToSize(`${prefix}${condition}`, contentWidth) as string[]
    const blockHeight = wrapped.length * lineHeight + 1.2
    ensureSpace(blockHeight)
    doc.text(wrapped, marginX, y)
    y += blockHeight
  })

  return y
}
