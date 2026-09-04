import { jsPDF, GState } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import {
  GENDER,
  TICKET_CATEGORY,
  TICKET_STATUS,
  type TicketCategory,
} from '@/constants/ticket'
import { getCheckpointDisplayName } from '@/lib/checkpoint'
import { normalizeGender, sortTicketsByCreatedAtAsc } from '@/lib/ticket'
import { ticketService } from '@/services/ticket.service'
import type { Ticket } from '@/types/ticket'
import type { Checkpoint } from '@/types/checkpoint'

export interface PassengerManifestEntry {
  ticket: Ticket
  observation: string
}

export interface PassengerManifestParams {
  departureLabel: string
  destinationLabel: string
  departureCode: string
  destinationCode: string
  travelDate: string
  manifestNumber: string
  /** Passagers issus des billets vendus, ordre createdAt croissant. */
  passengers: PassengerManifestEntry[]
}

export type ManifestPassengerType = 'M' | 'F' | 'C' | 'I'

export interface ManifestPassengerCounts {
  male: number
  female: number
  child: number
  infant: number
}

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }
const GREEN = { r: 34, g: 139, b: 34 }
const HEADER_FILL: [number, number, number] = [173, 216, 230]
const CLOSURE_FILL: [number, number, number] = [198, 239, 206]
const GRID_COLOR: [number, number, number] = [40, 40, 40]

const MARGIN_X = 10
const LOGO_WIDTH_MM = 28
const LOGO_HEIGHT_MM = 18
const TABLE_START_Y = 52
const FOOTER_RESERVE_MM = 8
/** Nombre de lignes passagers sur le modèle papier */
const TARGET_PASSENGER_ROWS = 37

const COLUMN_WIDTHS_MM = {
  index: 8,
  name: 52,
  male: 8,
  female: 8,
  child: 8,
  infant: 8,
  ticket: 22,
  nb: 10,
  pt: 12,
  observations: 54,
} as const

function formatRowIndex(index: number): string {
  return String(index).padStart(2, '0')
}

function formatManifestDate(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

/**
 * Classement manifeste :
 * - I : bébé 0–1 an (catégorie INF ou âge ≤ 1)
 * - C : enfant 1–12 ans (catégorie CD ou âge 2–12)
 * - M / F : adulte ≥ 18 ans (catégorie AD + genre, ou âge ≥ 18 + genre)
 */
export function resolveManifestPassengerType(ticket: Pick<Ticket, 'category' | 'gender' | 'age'>): ManifestPassengerType | null {
  const category = ticket.category?.trim().toUpperCase() as TicketCategory | undefined
  const gender = normalizeGender(ticket.gender)
  const age = ticket.age

  if (category === TICKET_CATEGORY.INF) return 'I'
  if (category === TICKET_CATEGORY.CD) return 'C'
  if (category === TICKET_CATEGORY.AD) {
    if (gender === GENDER.MALE) return 'M'
    if (gender === GENDER.FEMALE) return 'F'
    return null
  }

  if (age != null && Number.isFinite(age)) {
    if (age <= 1) return 'I'
    if (age >= 2 && age <= 12) return 'C'
    if (age >= 18) {
      if (gender === GENDER.MALE) return 'M'
      if (gender === GENDER.FEMALE) return 'F'
    }
    if (age >= 13 && age <= 17) return 'C'
  }

  return null
}

function typeToColumnCells(type: ManifestPassengerType | null): [string, string, string, string] {
  return [
    type === 'M' ? '1' : '',
    type === 'F' ? '1' : '',
    type === 'C' ? '1' : '',
    type === 'I' ? '1' : '',
  ]
}

export function countManifestPassengers(passengers: PassengerManifestEntry[]): ManifestPassengerCounts {
  const counts: ManifestPassengerCounts = { male: 0, female: 0, child: 0, infant: 0 }
  for (const entry of passengers) {
    const type = resolveManifestPassengerType(entry.ticket)
    if (type === 'M') counts.male += 1
    else if (type === 'F') counts.female += 1
    else if (type === 'C') counts.child += 1
    else if (type === 'I') counts.infant += 1
  }
  return counts
}

export function getCheckpointManifestName(checkpoint: string | Checkpoint): string {
  if (typeof checkpoint === 'object') {
    return (checkpoint.label ?? '').trim() || getCheckpointDisplayName(checkpoint)
  }
  return checkpoint.trim()
}

export function getCheckpointRouteCode(checkpoint: string | Checkpoint): string {
  const name = getCheckpointDisplayName(checkpoint).trim().replace(/\s+/g, '')
  const upper = name.toUpperCase()
  return upper.length <= 6 ? upper : upper.slice(0, 3)
}

export function buildManifestNumber(travelDate: string, departureCode: string, destinationCode: string): string {
  const compact = travelDate.replace(/-/g, '')
  return `${compact}-${departureCode}-${destinationCode}`
}

export function filterTicketsForManifest(tickets: Ticket[]): Ticket[] {
  return tickets.filter(
    (ticket) =>
      ticket.status !== TICKET_STATUS.CANCELLED && ticket.status !== TICKET_STATUS.REFUNDED,
  )
}

export async function fetchPassengersForManifest(
  departure: string,
  destination: string,
  travelDate: string,
): Promise<PassengerManifestEntry[]> {
  const { items } = await ticketService.getAll({
    departure,
    destination,
    travelDate,
    itemsPerPage: 500,
    page: 1,
  })

  const tickets = sortTicketsByCreatedAtAsc(filterTicketsForManifest(items))

  return tickets.map((ticket) => ({
    ticket,
    observation: '',
  }))
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

function drawBrandTitle(doc: jsPDF, centerX: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  const kapPart = 'KAP '
  const fretPart = 'FRET S.A.R.L'
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

function drawHeader(doc: jsPDF, params: PassengerManifestParams, logoDataUrl: string | null): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const centerX = pageWidth / 2
  const topY = 8

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_X, topY, LOGO_WIDTH_MM, LOGO_HEIGHT_MM)
    } catch {
      // ignore
    }
  }

  drawBrandTitle(doc, centerX, topY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(0, 0, 0)
  doc.text('AGENCE DE VOYAGE', centerX, topY + 10, { align: 'center' })
  doc.text(
    `${BRAND.rccm}, ID.NAT.${BRAND.idNat}, N°Impôt. ${BRAND.taxNumber}`,
    centerX,
    topY + 14,
    { align: 'center' },
  )
  doc.text(BRAND.address, centerX, topY + 18, { align: 'center' })
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text(BRAND.contactLine, centerX, topY + 22, { align: 'center' })

  const titleY = topY + 30
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text('MANIFESTE — PASSAGERS', MARGIN_X, titleY)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text(` N° : ${params.manifestNumber || '..........'}`, MARGIN_X + doc.getTextWidth('MANIFESTE — PASSAGERS'), titleY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text(
    `TRAJET : ${params.departureLabel.toUpperCase()} – ${params.destinationLabel.toUpperCase()}`,
    pageWidth - MARGIN_X,
    titleY,
    { align: 'right' },
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `DATE DU VOL : ${formatManifestDate(params.travelDate)}`,
    pageWidth - MARGIN_X,
    titleY + 5,
    { align: 'right' },
  )

  doc.setTextColor(0, 0, 0)
  return TABLE_START_Y
}

function drawWatermark(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.saveGraphicsState()
  doc.setGState(new GState({ opacity: 0.07 }))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(56)
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text('KAP FRET', pageWidth / 2, pageHeight / 2 + 10, {
    align: 'center',
    angle: 28,
  })
  doc.restoreGraphicsState()
}

function emptyPassengerRow(rowNumber: number): string[] {
  return [
    formatRowIndex(rowNumber),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]
}

function buildPassengerRow(entry: PassengerManifestEntry, rowNumber: number): string[] {
  const [m, f, c, i] = typeToColumnCells(resolveManifestPassengerType(entry.ticket))
  return [
    formatRowIndex(rowNumber),
    entry.ticket.passengerName?.trim() || '—',
    m,
    f,
    c,
    i,
    entry.ticket.ticketNumber?.trim() || '',
    '',
    '',
    entry.observation?.trim() ?? '',
  ]
}

function buildClosureRow(counts: ManifestPassengerCounts): (string | { content: string; colSpan?: number })[] {
  const mfTotal = counts.male + counts.female
  return [
    '',
    'CLOTURE',
    {
      content: mfTotal > 0 ? String(mfTotal) : '',
      colSpan: 2,
    },
    counts.child > 0 ? String(counts.child) : '',
    counts.infant > 0 ? String(counts.infant) : '',
    '',
    '',
    '',
    '',
  ]
}

function buildTableBody(passengers: PassengerManifestEntry[]): (string | { content: string; colSpan?: number })[][] {
  const rows: (string | { content: string; colSpan?: number })[][] = []

  for (let i = 0; i < TARGET_PASSENGER_ROWS; i += 1) {
    const entry = passengers[i]
    rows.push(entry ? buildPassengerRow(entry, i + 1) : emptyPassengerRow(i + 1))
  }

  rows.push(buildClosureRow(countManifestPassengers(passengers)))
  return rows
}

export async function generatePassengerManifestPdf(params: PassengerManifestParams): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadImageDataUrl(BRAND.logoSrc)
  const tableStartY = drawHeader(doc, params, logoDataUrl)
  const rows = buildTableBody(params.passengers)
  const closureRowIndex = rows.length - 1

  autoTable(doc, {
    startY: tableStartY,
    head: [
      [
        { content: 'N°', rowSpan: 2 },
        { content: 'NOMS PASSAGERS', rowSpan: 2 },
        { content: 'M', rowSpan: 2 },
        { content: 'F', rowSpan: 2 },
        { content: 'C', rowSpan: 2 },
        { content: 'I', rowSpan: 2 },
        { content: 'N° BILLETS', rowSpan: 2 },
        { content: 'POIDS', colSpan: 2 },
        { content: 'OBSERVATIONS', rowSpan: 2 },
      ],
      ['NB', 'PT'],
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
      minCellHeight: 5,
      overflow: 'linebreak',
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6,
      cellPadding: 1.3,
      valign: 'middle',
      lineColor: GRID_COLOR,
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: COLUMN_WIDTHS_MM.index, halign: 'center' },
      1: { cellWidth: COLUMN_WIDTHS_MM.name },
      2: { cellWidth: COLUMN_WIDTHS_MM.male, halign: 'center' },
      3: { cellWidth: COLUMN_WIDTHS_MM.female, halign: 'center' },
      4: { cellWidth: COLUMN_WIDTHS_MM.child, halign: 'center' },
      5: { cellWidth: COLUMN_WIDTHS_MM.infant, halign: 'center' },
      6: { cellWidth: COLUMN_WIDTHS_MM.ticket, halign: 'center' },
      7: { cellWidth: COLUMN_WIDTHS_MM.nb, halign: 'center' },
      8: { cellWidth: COLUMN_WIDTHS_MM.pt, halign: 'right' },
      9: { cellWidth: COLUMN_WIDTHS_MM.observations },
    },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: FOOTER_RESERVE_MM },
    showHead: 'firstPage',
    didParseCell: (data) => {
      if (data.section === 'head' && data.row.index === 0) {
        if (data.column.index === 2 || data.column.index === 3) {
          data.cell.styles.textColor = [NAVY.r, NAVY.g, NAVY.b]
        }
        if (data.column.index === 4 || data.column.index === 5) {
          data.cell.styles.textColor = [ORANGE.r, ORANGE.g, ORANGE.b]
        }
      }

      if (data.section === 'body' && data.row.index === closureRowIndex) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = CLOSURE_FILL
        if (data.column.index === 1) {
          data.cell.styles.textColor = [GREEN.r, GREEN.g, GREEN.b]
          data.cell.styles.halign = 'left'
        }
        if (data.column.index >= 2 && data.column.index <= 5) {
          data.cell.styles.halign = 'center'
          if (data.column.index === 2 || data.column.index === 4) {
            data.cell.styles.textColor = [NAVY.r, NAVY.g, NAVY.b]
          }
          if (data.column.index === 4 || data.column.index === 5) {
            data.cell.styles.textColor = [ORANGE.r, ORANGE.g, ORANGE.b]
          }
        }
      }
    },
  })

  drawWatermark(doc)

  return doc.output('blob')
}

export function buildManifestFileName(params: Pick<PassengerManifestParams, 'departureCode' | 'destinationCode' | 'travelDate'>): string {
  const date = params.travelDate.replace(/-/g, '')
  return `MANIFESTE_PASSAGERS_${params.departureCode}_${params.destinationCode}_${date}.pdf`
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
