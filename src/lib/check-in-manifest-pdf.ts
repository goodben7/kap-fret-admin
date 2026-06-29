import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import { CHECK_IN_STATUS } from '@/constants/check-in'
import {
  buildCheckInManifestFilters,
  type CheckInFilters,
} from '@/lib/check-in-filters'
import {
  getCheckInCurrency,
  getCheckInPassengerName,
  getCheckInTicketId,
  getCheckInTicketNumber,
  hasCheckInObservations,
} from '@/lib/check-in'
import { checkInService } from '@/services/checkin.service'
import { ticketService } from '@/services/ticket.service'
import type { CheckIn } from '@/types/check-in'
import {
  buildManifestNumber,
  downloadBlob,
} from '@/lib/passenger-manifest-pdf'
import { CURRENCY, type Currency } from '@/constants/ticket'

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
const HEADER_FILL: [number, number, number] = [252, 211, 177]

const MARGIN_X = 12
const FOOTER_HEIGHT_MM = 22
const LOGO_WIDTH_MM = 30
const LOGO_HEIGHT_MM = 18

/** Largeur utile A4 paysage (297 mm − marges gauche/droite) */
const USABLE_TABLE_WIDTH_MM = 297 - MARGIN_X * 2

const MANIFEST_CURRENCY_ORDER: Currency[] = [CURRENCY.USD, CURRENCY.CDF]

const COLUMN_COUNT = 11

/** Largeurs colonnes (mm) — total = USABLE_TABLE_WIDTH_MM */
const COLUMN_WIDTHS_MM = {
  index: 8,
  name: 49,
  ticket: 25,
  checkInWeight: 19,
  totalWeight: 20,
  allowance: 18,
  hand: 18,
  excess: 19,
  netToPay: 28,
  balance: 25,
  observations: 44,
} as const

const TABLE_WIDTH_MM = USABLE_TABLE_WIDTH_MM

const HEADER_ROW_MM = 10
const ROW_HEIGHT_MM = 7
const MIN_EMPTY_ROWS_AFTER_DATA = 3

function formatManifestDate(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

function formatKgCell(value: string | number | undefined): string {
  const num = typeof value === 'number' ? value : parseFloat(value ?? '')
  if (Number.isNaN(num)) return '—'
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatManifestMoney(amount: number, currency: Currency): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const formatted = safeAmount.toLocaleString('fr-FR', {
    minimumFractionDigits: currency === CURRENCY.USD ? 2 : 0,
    maximumFractionDigits: currency === CURRENCY.USD ? 2 : 0,
  })
  // jsPDF (Helvetica) ne rend pas l'espace fine U+202F du locale fr-FR → "/" à l'écran
  const normalized = formatted.replace(/[\u00A0\u202F]/g, ' ')
  const symbol = currency === CURRENCY.USD ? '$' : 'Fc'
  return `${normalized} ${symbol}`
}

function formatMoneyCell(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount) || amount === 0) return '—'
  return formatManifestMoney(amount, currency)
}

function formatTotalMoneyCell(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount)) return '—'
  return formatManifestMoney(amount, currency)
}

function getTotalCheckInWeightKg(checkIn: CheckIn): number {
  const checked = parseFloat(checkIn.checkInWeight) || 0
  const hand = parseFloat(checkIn.handBaggageWeight) || 0
  return checked + hand
}

export function filterCheckInsForManifest(checkIns: CheckIn[]): CheckIn[] {
  return checkIns.filter((checkIn) => checkIn.status !== CHECK_IN_STATUS.CANCELLED)
}

export function sortCheckInsForManifest(checkIns: CheckIn[]): CheckIn[] {
  const currencyRank = (currency: Currency) => {
    const index = MANIFEST_CURRENCY_ORDER.indexOf(currency)
    return index === -1 ? MANIFEST_CURRENCY_ORDER.length : index
  }

  return [...checkIns].sort((a, b) => {
    const currencyCompare =
      currencyRank(getCheckInCurrency(a)) - currencyRank(getCheckInCurrency(b))
    if (currencyCompare !== 0) return currencyCompare
    return (getCheckInPassengerName(a) ?? '').localeCompare(getCheckInPassengerName(b) ?? '', 'fr')
  })
}

function groupCheckInsByCurrency(checkIns: CheckIn[]): Map<Currency, CheckIn[]> {
  const groups = new Map<Currency, CheckIn[]>(
    MANIFEST_CURRENCY_ORDER.map((currency) => [currency, []]),
  )

  for (const checkIn of checkIns) {
    const currency = getCheckInCurrency(checkIn)
    const list = groups.get(currency) ?? []
    list.push(checkIn)
    groups.set(currency, list)
  }

  return groups
}

interface ManifestTableBuildResult {
  rows: string[][]
  totalRowIndexes: Set<number>
}

function emptyManifestRow(): string[] {
  return Array.from({ length: COLUMN_COUNT }, () => '')
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

function buildCheckInManifestRows(checkIns: CheckIn[]): ManifestTableBuildResult {
  const groups = groupCheckInsByCurrency(checkIns)
  const rows: string[][] = []
  const totalRowIndexes = new Set<number>()
  const totalsByCurrency = new Map<Currency, number>()
  let rowIndex = 0
  let globalIndex = 0

  for (const currency of MANIFEST_CURRENCY_ORDER) {
    const group = groups.get(currency) ?? []
    if (group.length === 0) continue

    let runningBalance = 0

    for (const checkIn of group) {
      globalIndex += 1
      const netToPay = parseFloat(checkIn.netToPay) || 0
      runningBalance += netToPay

      rows.push([
        String(globalIndex),
        getCheckInPassengerName(checkIn) ?? '—',
        getCheckInTicketNumber(checkIn),
        formatKgCell(checkIn.checkInWeight),
        formatKgCell(getTotalCheckInWeightKg(checkIn)),
        formatKgCell(checkIn.baggageAllowanceKg),
        formatKgCell(checkIn.handBaggageWeight),
        formatKgCell(checkIn.excessWeightKg),
        formatMoneyCell(netToPay, currency),
        formatMoneyCell(runningBalance, currency),
        hasCheckInObservations(checkIn.observations) ? checkIn.observations!.trim() : '',
      ])
      rowIndex += 1
    }

    totalsByCurrency.set(currency, runningBalance)
  }

  for (const currency of MANIFEST_CURRENCY_ORDER) {
    const total = totalsByCurrency.get(currency)
    if (total == null) continue

    rows.push([
      '',
      `TOTAL ${currency}`,
      '',
      '',
      '',
      '',
      '',
      '',
      formatMoneyCell(total, currency),
      formatTotalMoneyCell(total, currency),
      '',
    ])
    totalRowIndexes.add(rowIndex)
    rowIndex += 1
  }

  return { rows, totalRowIndexes }
}

function drawBrandTitle(doc: jsPDF, centerX: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)

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
  const topY = 10

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
  doc.text(`DATE DU VOL : ${formatManifestDate(params.travelDate)}`, rightX, topY + 3, {
    align: 'right',
  })
  doc.text(`N° DU VOL : ${params.flightNumber}`, rightX, topY + 9, { align: 'right' })

  drawBrandTitle(doc, centerX, topY + 10)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text(
    `MANIFESTE PASSAGERS CHECK-IN ${params.departureLabel.toUpperCase()}`,
    centerX,
    topY + 18,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `TRAJET : ${params.departureCode} – ${params.destinationCode}`,
    centerX,
    topY + 25,
    { align: 'center' },
  )

  return topY + 32
}

function drawFooter(doc: jsPDF, params: CheckInManifestParams) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const blockRight = pageWidth - MARGIN_X
  const blockWidth = 98
  const blockLeft = blockRight - blockWidth
  const signatureLineY = pageHeight - FOOTER_HEIGHT_MM + 4
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
  doc.setDrawColor(60, 60, 60)
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
    head: [[
      'N°',
      'NOMS',
      'N° BILLETS',
      'POIDS\nCHECK-IN',
      'POIDS TOTAL\nCHECK-IN',
      'POIDS\nFRANCHISES',
      'BAGAGES\nA MAIN',
      'TOTAL\nEXCEDENTS',
      'NET A PAYER\nEXCEDENT',
      'SOLDE',
      'OBSERVATIONS',
    ]],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.8,
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
      valign: 'middle',
      minCellHeight: 6,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: [40, 40, 40],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: COLUMN_WIDTHS_MM.index, halign: 'center' },
      1: { cellWidth: COLUMN_WIDTHS_MM.name },
      2: { cellWidth: COLUMN_WIDTHS_MM.ticket, halign: 'center' },
      3: { cellWidth: COLUMN_WIDTHS_MM.checkInWeight, halign: 'right' },
      4: { cellWidth: COLUMN_WIDTHS_MM.totalWeight, halign: 'right' },
      5: { cellWidth: COLUMN_WIDTHS_MM.allowance, halign: 'right' },
      6: { cellWidth: COLUMN_WIDTHS_MM.hand, halign: 'right' },
      7: { cellWidth: COLUMN_WIDTHS_MM.excess, halign: 'right' },
      8: { cellWidth: COLUMN_WIDTHS_MM.netToPay, halign: 'right' },
      9: { cellWidth: COLUMN_WIDTHS_MM.balance, halign: 'right' },
      10: { cellWidth: COLUMN_WIDTHS_MM.observations },
    },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: FOOTER_HEIGHT_MM },
    showHead: singlePage ? 'firstPage' : 'everyPage',
    didParseCell: (data) => {
      if (data.section !== 'body' || !totalRowIndexes.has(data.row.index)) return
      data.cell.styles.fontStyle = 'bold'
      data.cell.styles.fillColor = [245, 245, 245]
      if (data.column.index === 1 || data.column.index === 8 || data.column.index === 9) {
        data.cell.styles.halign = data.column.index === 1 ? 'left' : 'right'
      }
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
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
