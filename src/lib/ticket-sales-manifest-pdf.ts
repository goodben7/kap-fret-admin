import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import {
  CURRENCY,
  GENDER,
  GENDER_LABELS,
  PAYMENT_MODE_LABELS,
  TICKET_CATEGORY,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS,
  normalizeCurrency,
  type Currency,
  type Gender,
  type PaymentMode,
  type TicketCategory,
} from '@/constants/ticket'
import { getTicketTotal, sortTicketsByCreatedAtAsc } from '@/lib/ticket'
import {
  buildManifestNumber,
  downloadBlob,
  getCheckpointManifestName,
  getCheckpointRouteCode,
} from '@/lib/passenger-manifest-pdf'
import type { Ticket } from '@/types/ticket'

export { downloadBlob, getCheckpointManifestName, getCheckpointRouteCode, buildManifestNumber }

/** Billets vendus uniquement (hors annulés / remboursés) — indépendant du check-in. */
export function filterTicketsForSalesManifest(tickets: Ticket[]): Ticket[] {
  return tickets.filter(
    (ticket) =>
      ticket.status !== TICKET_STATUS.CANCELLED && ticket.status !== TICKET_STATUS.REFUNDED,
  )
}

/** Prépare la liste vente : billets vendus, ordre createdAt croissant. */
export function prepareTicketsForSalesManifest(tickets: Ticket[]): Ticket[] {
  return sortTicketsByCreatedAtAsc(filterTicketsForSalesManifest(tickets))
}

export interface TicketSalesManifestParams {
  departureLabel: string
  destinationLabel: string
  departureCode: string
  destinationCode: string
  travelDate: string
  flightNumber: string
  tickets: Ticket[]
}

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }

const MARGIN_X = 10
const FOOTER_HEIGHT_MM = 24
const LOGO_WIDTH_MM = 28
const LOGO_HEIGHT_MM = 16

const USABLE_TABLE_WIDTH_MM = 297 - MARGIN_X * 2
const TABLE_WIDTH_MM = USABLE_TABLE_WIDTH_MM
const COLUMN_COUNT = 9

/** Colonnes alignées sur le modèle papier : N°, noms, sexe, billet, catégorie, mode, montant, solde, sponsor */
const COLUMN_WIDTHS_MM = {
  index: 10,
  name: 68,
  gender: 14,
  ticket: 30,
  category: 22,
  paymentMode: 26,
  amount: 28,
  balance: 28,
  sponsor: 51,
} as const

const HEADER_ROW_MM = 10
const ROW_HEIGHT_MM = 7
const MIN_EMPTY_ROWS_AFTER_DATA = 3

const MANIFEST_CURRENCY_ORDER: Currency[] = [CURRENCY.USD, CURRENCY.CDF]

const SHORT_CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TICKET_CATEGORY.INF]: 'INF',
  [TICKET_CATEGORY.CD]: 'CD',
  [TICKET_CATEGORY.AD]: 'AD',
}

function formatManifestDate(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

function getTicketPaymentCurrency(ticket: Ticket): Currency {
  return normalizeCurrency(ticket.paymentCurrency ?? ticket.currency)
}

function formatManifestMoney(amount: number, currency: Currency): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const formatted = safeAmount
    .toLocaleString('fr-FR', {
      minimumFractionDigits: currency === CURRENCY.USD ? 2 : 0,
      maximumFractionDigits: currency === CURRENCY.USD ? 2 : 0,
    })
    .replace(/[\u00A0\u202F]/g, ' ')
  const symbol = currency === CURRENCY.USD ? '$' : 'Fc'
  return `${formatted} ${symbol}`
}

function formatMoneyCell(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount) || amount === 0) return '—'
  return formatManifestMoney(amount, currency)
}

function formatPaymentMode(mode: PaymentMode | string | undefined): string {
  if (!mode) return '—'
  return PAYMENT_MODE_LABELS[mode as PaymentMode] ?? mode
}

function formatGender(gender: Gender | string | undefined): string {
  if (!gender) return '—'
  if (gender === GENDER.MALE || gender === GENDER.FEMALE) return gender
  return GENDER_LABELS[gender as Gender] ?? String(gender)
}

function formatCategory(category: TicketCategory | string | undefined): string {
  if (!category) return '—'
  const key = category.trim().toUpperCase() as TicketCategory
  if (key in SHORT_CATEGORY_LABELS) return SHORT_CATEGORY_LABELS[key]
  return TICKET_CATEGORY_LABELS[key as TicketCategory] ?? category
}

function emptyManifestRow(): string[] {
  return Array.from({ length: COLUMN_COUNT }, () => '')
}

interface ManifestTableBuildResult {
  rows: string[][]
  totalRowIndexes: Set<number>
}

function buildTicketSalesManifestRows(tickets: Ticket[]): ManifestTableBuildResult {
  const orderedTickets = prepareTicketsForSalesManifest(tickets)
  const rows: string[][] = []
  const totalRowIndexes = new Set<number>()
  const totalsByCurrency = new Map<Currency, number>([
    [CURRENCY.USD, 0],
    [CURRENCY.CDF, 0],
  ])
  const runningByCurrency = new Map<Currency, number>([
    [CURRENCY.USD, 0],
    [CURRENCY.CDF, 0],
  ])
  let rowIndex = 0

  for (let index = 0; index < orderedTickets.length; index += 1) {
    const ticket = orderedTickets[index]!
    const currency = getTicketPaymentCurrency(ticket)
    const amount = getTicketTotal(ticket)
    const running = (runningByCurrency.get(currency) ?? 0) + amount
    runningByCurrency.set(currency, running)
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + amount)

    rows.push([
      String(index + 1),
      ticket.passengerName?.trim() || '—',
      formatGender(ticket.gender),
      ticket.ticketNumber?.trim() || '—',
      formatCategory(ticket.category),
      formatPaymentMode(ticket.paymentMode),
      formatMoneyCell(amount, currency),
      formatMoneyCell(running, currency),
      ticket.sponsor?.trim() || '—',
    ])
    rowIndex += 1
  }

  for (const currency of MANIFEST_CURRENCY_ORDER) {
    const total = totalsByCurrency.get(currency) ?? 0
    if (total <= 0) continue

    rows.push([
      '',
      `TOTAL ${currency}`,
      '',
      '',
      '',
      '',
      formatMoneyCell(total, currency),
      formatManifestMoney(total, currency),
      '',
    ])
    totalRowIndexes.add(rowIndex)
    rowIndex += 1
  }

  return { rows, totalRowIndexes }
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

  const kapPart = 'KAP-'
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
  params: TicketSalesManifestParams,
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

  drawBrandTitle(doc, centerX, topY + 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text(
    `MANIFESTE VENTE BILLETS VOL NUMÉRO : ${params.flightNumber}`,
    centerX,
    topY + 16,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0)
  doc.text(`DIRECTION : ${params.departureLabel.toUpperCase()}`, centerX, topY + 23, {
    align: 'center',
  })

  const trajetLabel = `TRAJET : ${params.departureLabel.toUpperCase()} – ${params.destinationLabel.toUpperCase()}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(trajetLabel, centerX, topY + 30, { align: 'center' })
  const trajetWidth = doc.getTextWidth(trajetLabel)
  doc.setLineWidth(0.4)
  doc.setDrawColor(0, 0, 0)
  doc.line(centerX - trajetWidth / 2, topY + 31.5, centerX + trajetWidth / 2, topY + 31.5)

  return topY + 38
}

function drawFooter(doc: jsPDF, params: TicketSalesManifestParams) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const blockRight = pageWidth - MARGIN_X
  const blockWidth = 100
  const blockLeft = blockRight - blockWidth
  const signatureLineY = pageHeight - FOOTER_HEIGHT_MM + 5
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

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.text('SIGNATURE DU RESPONSABLE.', blockRight, labelY, { align: 'right' })
}

function drawPageBorder(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.35)
  doc.rect(4, 4, pageWidth - 8, pageHeight - 8)
}

export async function generateTicketSalesManifestPdf(
  params: TicketSalesManifestParams,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadImageDataUrl(BRAND.logoSrc)
  const pageHeight = doc.internal.pageSize.getHeight()
  const tableStartY = drawHeader(doc, params, logoDataUrl)

  const { rows: dataRows, totalRowIndexes } = buildTicketSalesManifestRows(params.tickets)
  const rows = buildTableBodyRows(dataRows, pageHeight, tableStartY)
  const singlePage = dataRows.length <= getMaxBodyRows(pageHeight, tableStartY)

  autoTable(doc, {
    startY: tableStartY,
    tableWidth: TABLE_WIDTH_MM,
    head: [[
      'N°',
      'NOMS & PRENOMS',
      'SEXE',
      'N° BILLET',
      'CATÉGORIE',
      'MODE PAIE.',
      'MONTANT',
      'SOLDE',
      'SPONSOR',
    ]],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.6,
      lineColor: [40, 40, 40],
      lineWidth: 0.25,
      valign: 'middle',
      minCellHeight: 6,
      overflow: 'linebreak',
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: COLUMN_WIDTHS_MM.index, halign: 'center' },
      1: { cellWidth: COLUMN_WIDTHS_MM.name },
      2: { cellWidth: COLUMN_WIDTHS_MM.gender, halign: 'center' },
      3: { cellWidth: COLUMN_WIDTHS_MM.ticket, halign: 'center' },
      4: { cellWidth: COLUMN_WIDTHS_MM.category, halign: 'center' },
      5: { cellWidth: COLUMN_WIDTHS_MM.paymentMode, halign: 'center' },
      6: { cellWidth: COLUMN_WIDTHS_MM.amount, halign: 'right' },
      7: { cellWidth: COLUMN_WIDTHS_MM.balance, halign: 'right' },
      8: { cellWidth: COLUMN_WIDTHS_MM.sponsor },
    },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: FOOTER_HEIGHT_MM },
    showHead: singlePage ? 'firstPage' : 'everyPage',
    didParseCell: (data) => {
      if (data.section !== 'body' || !totalRowIndexes.has(data.row.index)) return
      data.cell.styles.fontStyle = 'bold'
      data.cell.styles.fillColor = [245, 245, 245]
      if (data.column.index === 1 || data.column.index === 6 || data.column.index === 7) {
        data.cell.styles.halign = data.column.index === 1 ? 'left' : 'right'
      }
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    drawPageBorder(doc)
    drawFooter(doc, params)
  }

  return doc.output('blob')
}

export function buildTicketSalesManifestFileName(
  params: Pick<TicketSalesManifestParams, 'departureCode' | 'destinationCode' | 'travelDate'>,
): string {
  const date = params.travelDate.replace(/-/g, '')
  return `MANIFESTE_VENTE_BILLETS_${params.departureCode}_${params.destinationCode}_${date}.pdf`
}

export function resolveTicketSalesManifestFlightNumber(
  travelDate: string,
  departureCode: string,
  destinationCode: string,
  flightNumber?: string,
): string {
  const trimmed = flightNumber?.trim()
  if (trimmed) return trimmed
  return buildManifestNumber(travelDate, departureCode, destinationCode)
}
