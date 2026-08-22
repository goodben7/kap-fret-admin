import { jsPDF, GState } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import { CHECK_IN_STATUS, CHECK_IN_EXCESS_PRICE_PER_KG_USD } from '@/constants/check-in'
import {
  buildCheckInManifestFilters,
  type CheckInFilters,
} from '@/lib/check-in-filters'
import {
  getCheckInPassengerName,
  getCheckInTicketId,
  getCheckInTicketNumber,
  hasCheckInObservations,
  sortCheckInsByRegistrationOrder,
} from '@/lib/check-in'
import { checkInService } from '@/services/checkin.service'
import { ticketService } from '@/services/ticket.service'
import type { CheckIn } from '@/types/check-in'
import {
  buildManifestNumber,
  downloadBlob,
} from '@/lib/passenger-manifest-pdf'
import { CURRENCY, normalizeCurrency, type Currency } from '@/constants/ticket'

export { downloadBlob }

export interface CheckInManifestParams {
  departureLabel: string
  destinationLabel: string
  departureCode: string
  destinationCode: string
  travelDate: string
  flightNumber: string
  checkIns: CheckIn[]
}

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }
/** En-tête tableau — bleu clair (modèle papier) */
const HEADER_FILL: [number, number, number] = [173, 216, 230]
const GRID_COLOR: [number, number, number] = [40, 40, 40]

const MARGIN_X = 10
const FOOTER_HEIGHT_MM = 24
const LOGO_WIDTH_MM = 32
const LOGO_HEIGHT_MM = 20

/** Largeur utile A4 paysage */
const USABLE_TABLE_WIDTH_MM = 297 - MARGIN_X * 2

/**
 * Colonnes alignées sur le modèle papier :
 * N° | NOMS | N° BILLETS | POIDS CHECK-IN | POIDS TOTAL | FRANCHISES |
 * BAGAGES A MAIN | TOTAL EXCEDENTS | PRIX | NET USD/CDF | SOLDE USD/CDF | OBSERVAT°
 */
const COLUMN_COUNT = 14

const COLUMN_WIDTHS_MM = {
  index: 7,
  name: 40,
  ticket: 22,
  checkInWeight: 16,
  totalWeight: 16,
  franchise: 15,
  hand: 14,
  excess: 15,
  prix: 10,
  netToPayUsd: 12,
  netToPayCdf: 12,
  balanceUsd: 12,
  balanceCdf: 12,
  observations: 74,
} as const

const TABLE_WIDTH_MM = USABLE_TABLE_WIDTH_MM

const HEADER_ROW_MM = 11
const ROW_HEIGHT_MM = 6.5
const MIN_EMPTY_ROWS_AFTER_DATA = 4

const PRIX_CELL = `${CHECK_IN_EXCESS_PRICE_PER_KG_USD}$`

function formatManifestDate(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

function formatKgCell(value: string | number | undefined): string {
  const num = typeof value === 'number' ? value : parseFloat(value ?? '')
  if (Number.isNaN(num) || num === 0) return '—'
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatManifestWeightPart(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  if (Math.abs(value - Math.round(value)) < 0.001) {
    return String(Math.round(value))
  }
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Détail des poids enregistrés : soute + main + excédent (ex. « 15 + 5 + 7 »). */
function formatCheckInWeightBreakdown(checkIn: CheckIn): string {
  const parts: string[] = []
  const checked = parseFloat(checkIn.checkInWeight) || 0
  const hand = parseFloat(checkIn.handBaggageWeight) || 0
  const excess = parseFloat(checkIn.excessWeightKg) || 0

  const checkedPart = formatManifestWeightPart(checked)
  const handPart = formatManifestWeightPart(hand)
  const excessPart = formatManifestWeightPart(excess)

  if (checkedPart) parts.push(checkedPart)
  if (handPart) parts.push(handPart)
  if (excessPart) parts.push(excessPart)

  return parts.length > 0 ? parts.join(' + ') : '—'
}

function formatAmountCell(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount) || amount === 0) return '—'
  return amount
    .toLocaleString('fr-FR', {
      minimumFractionDigits: currency === CURRENCY.USD ? 2 : 0,
      maximumFractionDigits: currency === CURRENCY.USD ? 2 : 0,
    })
    .replace(/[\u00A0\u202F]/g, ' ')
}

function getCheckInPaymentCurrency(checkIn: CheckIn): Currency {
  return normalizeCurrency(checkIn.paymentCurrency ?? checkIn.currency)
}

function formatNetToPayCells(netToPay: number, paymentCurrency: Currency): [string, string] {
  return [
    paymentCurrency === CURRENCY.USD ? formatAmountCell(netToPay, CURRENCY.USD) : '—',
    paymentCurrency === CURRENCY.CDF ? formatAmountCell(netToPay, CURRENCY.CDF) : '—',
  ]
}

function formatBalanceCells(runningUsd: number, runningCdf: number): [string, string] {
  return [
    runningUsd === 0 ? '—' : formatAmountCell(runningUsd, CURRENCY.USD),
    runningCdf === 0 ? '—' : formatAmountCell(runningCdf, CURRENCY.CDF),
  ]
}

function getTotalCheckInWeightKg(checkIn: CheckIn): number {
  const checked = parseFloat(checkIn.checkInWeight) || 0
  const hand = parseFloat(checkIn.handBaggageWeight) || 0
  const excess = parseFloat(checkIn.excessWeightKg) || 0
  return checked + hand + excess
}

export function filterCheckInsForManifest(checkIns: CheckIn[]): CheckIn[] {
  return checkIns.filter((checkIn) => checkIn.status !== CHECK_IN_STATUS.CANCELLED)
}

export function sortCheckInsForManifest(checkIns: CheckIn[]): CheckIn[] {
  return sortCheckInsByRegistrationOrder(checkIns)
}

interface ManifestTableBuildResult {
  rows: string[][]
  totalRowIndexes: Set<number>
}

function emptyManifestRow(): string[] {
  const row = Array.from({ length: COLUMN_COUNT }, () => '')
  // Colonne PRIX préremplie comme sur le modèle papier
  row[8] = PRIX_CELL
  return row
}

function buildCheckInManifestRows(checkIns: CheckIn[]): ManifestTableBuildResult {
  const sortedCheckIns = sortCheckInsForManifest(checkIns)
  const rows: string[][] = []
  const totalRowIndexes = new Set<number>()
  let runningUsd = 0
  let runningCdf = 0
  let rowIndex = 0

  for (let index = 0; index < sortedCheckIns.length; index += 1) {
    const checkIn = sortedCheckIns[index]!
    const netToPay = parseFloat(checkIn.netToPay) || 0
    const paymentCurrency = getCheckInPaymentCurrency(checkIn)

    if (paymentCurrency === CURRENCY.USD) runningUsd += netToPay
    else runningCdf += netToPay

    const [netUsd, netCdf] = formatNetToPayCells(netToPay, paymentCurrency)
    const [balanceUsd, balanceCdf] = formatBalanceCells(runningUsd, runningCdf)

    rows.push([
      String(index + 1),
      getCheckInPassengerName(checkIn) ?? '—',
      getCheckInTicketNumber(checkIn),
      formatCheckInWeightBreakdown(checkIn),
      formatKgCell(getTotalCheckInWeightKg(checkIn)),
      formatKgCell(checkIn.baggageAllowanceKg),
      formatKgCell(checkIn.handBaggageWeight),
      formatKgCell(checkIn.excessWeightKg),
      PRIX_CELL,
      netUsd,
      netCdf,
      balanceUsd,
      balanceCdf,
      hasCheckInObservations(checkIn.observations) ? checkIn.observations!.trim() : '',
    ])
    rowIndex += 1
  }

  if (sortedCheckIns.length > 0) {
    const [totalNetUsd, totalNetCdf] = formatBalanceCells(runningUsd, runningCdf)
    const [totalBalanceUsd, totalBalanceCdf] = formatBalanceCells(runningUsd, runningCdf)

    rows.push([
      '',
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalNetUsd,
      totalNetCdf,
      totalBalanceUsd,
      totalBalanceCdf,
      '',
    ])
    totalRowIndexes.add(rowIndex)
  }

  return { rows, totalRowIndexes }
}

export async function fetchCheckInsForManifest(
  departure: string,
  destination: string,
  travelDate: string,
): Promise<CheckIn[]> {
  const filters = buildCheckInManifestFilters(departure, destination, travelDate)

  try {
    const { items } = await checkInService.getAll(filters)
    const filtered = filterCheckInsForManifest(items)
    if (filtered.length > 0) {
      return sortCheckInsForManifest(filtered)
    }
  } catch {
    // fallback ci-dessous
  }

  const { items: tickets } = await ticketService.getAll({
    departure,
    destination,
    travelDate,
    itemsPerPage: 500,
    page: 1,
  })

  if (tickets.length === 0) return []

  const ticketIds = new Set(tickets.map((ticket) => String(ticket.id)))
  const ticketNumbers = new Set(tickets.map((ticket) => ticket.ticketNumber))

  const { items: checkIns } = await checkInService.getAll({
    itemsPerPage: 500,
    page: 1,
    status: CHECK_IN_STATUS.CREATED,
  } satisfies CheckInFilters)

  const matched = checkIns.filter((checkIn) => {
    const ticketId = getCheckInTicketId(checkIn)
    if (ticketId && ticketIds.has(String(ticketId))) return true
    return ticketNumbers.has(getCheckInTicketNumber(checkIn))
  })

  return sortCheckInsForManifest(filterCheckInsForManifest(matched))
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

function getMaxBodyRows(pageHeight: number, tableStartY: number): number {
  const available = pageHeight - tableStartY - FOOTER_HEIGHT_MM - HEADER_ROW_MM
  return Math.max(1, Math.floor(available / ROW_HEIGHT_MM) - 1)
}

function buildTableBodyRows(
  dataRows: string[][],
  pageHeight: number,
  tableStartY: number,
): string[][] {
  const maxBodyRows = getMaxBodyRows(pageHeight, tableStartY)
  const emptyRow = emptyManifestRow()

  if (dataRows.length <= maxBodyRows) {
    const rows = [...dataRows]
    const targetLength = Math.max(dataRows.length + MIN_EMPTY_ROWS_AFTER_DATA, maxBodyRows)
    while (rows.length < targetLength && rows.length < maxBodyRows) {
      rows.push([...emptyRow])
    }
    return rows
  }

  return dataRows
}

function drawBrandTitle(doc: jsPDF, centerX: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)

  const kapPart = 'KAP '
  const fretPart = 'FRET'
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  const kapWidth = doc.getTextWidth(kapPart)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  const fretWidth = doc.getTextWidth(fretPart)
  const startX = centerX - (kapWidth + fretWidth) / 2

  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text(kapPart, startX, y)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text(fretPart, startX + kapWidth, y)
}

function drawHeader(
  doc: jsPDF,
  params: CheckInManifestParams,
  logoDataUrl: string | null,
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const centerX = pageWidth / 2
  const rightX = pageWidth - MARGIN_X
  const topY = 8

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_X, topY, LOGO_WIDTH_MM, LOGO_HEIGHT_MM)
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`DATE DU VOL : ${formatManifestDate(params.travelDate)}`, rightX, topY + 4, {
    align: 'right',
  })
  doc.text(`N° DU VOL : ${params.flightNumber || '..........'}`, rightX, topY + 10, {
    align: 'right',
  })

  drawBrandTitle(doc, centerX, topY + 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `MANIFESTE PASSAGERS CHECK-IN ${params.departureLabel.toUpperCase()}`,
    centerX,
    topY + 17,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `TRAJET : ${params.departureCode} – ${params.destinationCode}`,
    centerX,
    topY + 23,
    { align: 'center' },
  )

  return topY + 28
}

function drawWatermark(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.saveGraphicsState()
  doc.setGState(new GState({ opacity: 0.08 }))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(64)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text('KAP FRET', pageWidth / 2, pageHeight / 2 + 5, {
    align: 'center',
    angle: 28,
  })
  doc.restoreGraphicsState()
}

function drawFooter(doc: jsPDF, params: CheckInManifestParams) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const blockRight = pageWidth - MARGIN_X
  const blockWidth = 100
  const blockLeft = blockRight - blockWidth
  const signatureLineY = pageHeight - FOOTER_HEIGHT_MM + 6
  const labelY = signatureLineY + 5
  const faitY = signatureLineY - 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `FAIT À ${params.departureLabel.toUpperCase()}, LE ${formatManifestDate(params.travelDate)}`,
    blockRight,
    faitY,
    { align: 'right' },
  )

  doc.setLineWidth(0.35)
  doc.setDrawColor(40, 40, 40)
  doc.line(blockLeft, signatureLineY, blockRight, signatureLineY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('SIGNATURE DU RESPONSABLE.', blockRight, labelY, { align: 'right' })
}

export async function generateCheckInManifestPdf(params: CheckInManifestParams): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadImageDataUrl(BRAND.logoSrc)
  const pageHeight = doc.internal.pageSize.getHeight()
  const tableStartY = drawHeader(doc, params, logoDataUrl)

  const { rows: dataRows, totalRowIndexes } = buildCheckInManifestRows(params.checkIns)
  const rows = buildTableBodyRows(dataRows, pageHeight, tableStartY)
  const singlePage = dataRows.length <= getMaxBodyRows(pageHeight, tableStartY)

  autoTable(doc, {
    startY: tableStartY,
    tableWidth: TABLE_WIDTH_MM,
    head: [
      [
        { content: 'N°', rowSpan: 2 },
        { content: 'NOMS', rowSpan: 2 },
        { content: 'N° BILLETS', rowSpan: 2 },
        { content: 'POIDS\nCHECK-IN', rowSpan: 2 },
        { content: 'POIDS TOTAL\nCHECK-IN', rowSpan: 2 },
        { content: 'POIDS\nFRANCHISES', rowSpan: 2 },
        { content: 'BAGAGES\nA MAIN', rowSpan: 2 },
        { content: 'TOTAL\nEXCEDENTS', rowSpan: 2 },
        { content: 'PRIX', rowSpan: 2 },
        { content: 'NET A PAYER\nEXCEDENT', colSpan: 2 },
        { content: 'SOLDE', colSpan: 2 },
        { content: 'OBSERVAT°', rowSpan: 2 },
      ],
      ['USD', 'CDF', 'USD', 'CDF'],
    ],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.2,
      lineColor: GRID_COLOR,
      lineWidth: 0.25,
      valign: 'middle',
      minCellHeight: 5.5,
      overflow: 'linebreak',
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 5.8,
      cellPadding: 1.4,
      valign: 'middle',
      lineColor: GRID_COLOR,
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: COLUMN_WIDTHS_MM.index, halign: 'center' },
      1: { cellWidth: COLUMN_WIDTHS_MM.name },
      2: { cellWidth: COLUMN_WIDTHS_MM.ticket, halign: 'center' },
      3: { cellWidth: COLUMN_WIDTHS_MM.checkInWeight, halign: 'center' },
      4: { cellWidth: COLUMN_WIDTHS_MM.totalWeight, halign: 'right' },
      5: { cellWidth: COLUMN_WIDTHS_MM.franchise, halign: 'right' },
      6: { cellWidth: COLUMN_WIDTHS_MM.hand, halign: 'right' },
      7: { cellWidth: COLUMN_WIDTHS_MM.excess, halign: 'right' },
      8: { cellWidth: COLUMN_WIDTHS_MM.prix, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: COLUMN_WIDTHS_MM.netToPayUsd, halign: 'right' },
      10: { cellWidth: COLUMN_WIDTHS_MM.netToPayCdf, halign: 'right' },
      11: { cellWidth: COLUMN_WIDTHS_MM.balanceUsd, halign: 'right' },
      12: { cellWidth: COLUMN_WIDTHS_MM.balanceCdf, halign: 'right' },
      13: { cellWidth: COLUMN_WIDTHS_MM.observations },
    },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: FOOTER_HEIGHT_MM },
    showHead: singlePage ? 'firstPage' : 'everyPage',
    didParseCell: (data) => {
      if (data.section !== 'body' || !totalRowIndexes.has(data.row.index)) return
      data.cell.styles.fontStyle = 'bold'
      data.cell.styles.fillColor = [235, 245, 250]
      if (data.column.index === 1 || (data.column.index >= 9 && data.column.index <= 12)) {
        data.cell.styles.halign = data.column.index === 1 ? 'left' : 'right'
      }
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    drawWatermark(doc)
    drawFooter(doc, params)
  }

  return doc.output('blob')
}

export function buildCheckInManifestFileName(
  params: Pick<CheckInManifestParams, 'departureCode' | 'destinationCode' | 'travelDate'>,
): string {
  const date = params.travelDate.replace(/-/g, '')
  return `MANIFESTE_CHECKIN_${params.departureCode}_${params.destinationCode}_${date}.pdf`
}

export function resolveCheckInManifestFlightNumber(
  travelDate: string,
  departureCode: string,
  destinationCode: string,
  flightNumber?: string,
): string {
  const trimmed = flightNumber?.trim()
  if (trimmed) return trimmed
  return buildManifestNumber(travelDate, departureCode, destinationCode)
}
