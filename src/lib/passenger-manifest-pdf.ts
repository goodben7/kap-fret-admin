import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import { CHECK_IN_STATUS } from '@/constants/check-in'
import { GENDER, TICKET_STATUS } from '@/constants/ticket'
import { getCheckpointDisplayName } from '@/lib/checkpoint'
import {
  getCheckInTicketId,
  getCheckInTicketNumber,
  hasCheckInObservations,
} from '@/lib/check-in'
import {
  buildCheckInManifestFilters,
  type CheckInFilters,
} from '@/lib/check-in-filters'
import { sortCheckInsByRegistrationOrder } from '@/lib/check-in'
import { normalizeGender } from '@/lib/ticket'
import { checkInService } from '@/services/checkin.service'
import { ticketService } from '@/services/ticket.service'
import type { CheckIn } from '@/types/check-in'
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
  /** Passagers ordonnés par date d'enregistrement check-in (plus ancien = N° 1). */
  passengers: PassengerManifestEntry[]
}

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }
const HEADER_FILL: [number, number, number] = [252, 211, 177]

function formatManifestDate(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
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

function getEmbeddedTicket(checkIn: CheckIn): Ticket | null {
  if (typeof checkIn.ticket === 'object' && checkIn.ticket && 'ticketNumber' in checkIn.ticket) {
    return checkIn.ticket
  }
  return null
}

function filterActiveCheckIns(checkIns: CheckIn[]): CheckIn[] {
  return checkIns.filter((checkIn) => checkIn.status !== CHECK_IN_STATUS.CANCELLED)
}

/**
 * Passagers du manifeste : check-ins du vol, triés par ordre d'enregistrement.
 * Le premier check-in créé devient le N° 1.
 */
export async function fetchPassengersForManifest(
  departure: string,
  destination: string,
  travelDate: string,
): Promise<PassengerManifestEntry[]> {
  const filters = buildCheckInManifestFilters(departure, destination, travelDate)

  let checkIns: CheckIn[] = []

  try {
    const { items } = await checkInService.getAll(filters)
    checkIns = filterActiveCheckIns(items)
  } catch {
    checkIns = []
  }

  if (checkIns.length === 0) {
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

    const { items: allCheckIns } = await checkInService.getAll({
      itemsPerPage: 500,
      page: 1,
      status: CHECK_IN_STATUS.CREATED,
    } satisfies CheckInFilters)

    checkIns = filterActiveCheckIns(allCheckIns).filter((checkIn) => {
      const ticketId = getCheckInTicketId(checkIn)
      if (ticketId && ticketIds.has(String(ticketId))) return true
      return ticketNumbers.has(getCheckInTicketNumber(checkIn))
    })
  }

  const orderedCheckIns = sortCheckInsByRegistrationOrder(checkIns)
  if (orderedCheckIns.length === 0) return []

  // Le ticket embarqué dans le check-in est souvent partiel (sans category/gender).
  // On recharge toujours les billets du vol pour compléter ces champs.
  const { items: routeTickets } = await ticketService.getAll({
    departure,
    destination,
    travelDate,
    itemsPerPage: 500,
    page: 1,
  })
  const ticketsById = new Map(routeTickets.map((ticket) => [String(ticket.id), ticket]))
  const ticketsByNumber = new Map(routeTickets.map((ticket) => [ticket.ticketNumber, ticket]))

  const passengers: PassengerManifestEntry[] = []

  for (const checkIn of orderedCheckIns) {
    const embedded = getEmbeddedTicket(checkIn)
    const ticketId = getCheckInTicketId(checkIn) ?? embedded?.id ?? null
    const ticketNumber = embedded?.ticketNumber || getCheckInTicketNumber(checkIn)
    let ticket =
      (ticketId ? ticketsById.get(String(ticketId)) : undefined)
      ?? ticketsByNumber.get(ticketNumber)
      ?? embedded
      ?? null

    // Complète category / gender si le billet embarqué est incomplet.
    if (ticket && ticketId && (ticket.category == null || ticket.gender == null || ticket.gender === '')) {
      try {
        const fullTicket = await ticketService.getById(String(ticketId))
        ticket = fullTicket
        ticketsById.set(String(fullTicket.id), fullTicket)
        ticketsByNumber.set(fullTicket.ticketNumber, fullTicket)
      } catch {
        // garde le billet partiel
      }
    }

    if (!ticket) continue
    if (ticket.status === TICKET_STATUS.CANCELLED || ticket.status === TICKET_STATUS.REFUNDED) continue

    passengers.push({
      ticket,
      observation: hasCheckInObservations(checkIn.observations)
        ? checkIn.observations!.trim()
        : '',
    })
  }

  return passengers
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

function drawHeader(doc: jsPDF, params: PassengerManifestParams, logoDataUrl: string | null) {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 12

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 12, y - 2, 28, 18)
    } catch {
      // ignore invalid image
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text('KAP', pageWidth / 2 - 18, y + 8, { align: 'right' })
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b)
  doc.text('FRET', pageWidth / 2 - 16, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`DATE: ${formatManifestDate(params.travelDate)}`, pageWidth - 12, y + 4, { align: 'right' })

  y += 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`MANIFESTE PASSAGERS N°: ${params.manifestNumber}`, 12, y)
  doc.text(
    `TRAJET: ${params.departureLabel} – ${params.destinationLabel}`,
    pageWidth - 12,
    y,
    { align: 'right' },
  )
}

const TABLE_START_Y = 40
const FOOTER_RESERVE_MM = 22
const HEADER_ROW_MM = 9
const ROW_HEIGHT_MM = 7.5
const MIN_EMPTY_ROWS_AFTER_PASSENGERS = 3

function getMaxBodyRows(pageHeight: number): number {
  const available = pageHeight - TABLE_START_Y - FOOTER_RESERVE_MM - HEADER_ROW_MM
  return Math.max(1, Math.floor(available / ROW_HEIGHT_MM) - 1)
}

function buildTableBodyRows(passengerRows: string[][], pageHeight: number): string[][] {
  const maxBodyRows = getMaxBodyRows(pageHeight)
  const emptyRow = ['', '', '', '', '', '']

  if (passengerRows.length <= maxBodyRows) {
    const rows = [...passengerRows]
    const targetLength = Math.max(
      passengerRows.length + MIN_EMPTY_ROWS_AFTER_PASSENGERS,
      maxBodyRows,
    )
    while (rows.length < targetLength && rows.length < maxBodyRows) {
      rows.push([...emptyRow])
    }
    return rows
  }

  return passengerRows
}

function formatGender(gender: string | undefined): string {
  const normalized = normalizeGender(gender)
  if (normalized === GENDER.MALE) return 'M'
  if (normalized === GENDER.FEMALE) return 'F'
  return '—'
}

function drawClosure(doc: jsPDF, passengerCount: number) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const clotureY = pageHeight - 16

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text('CLOTURE:', 12, clotureY)
  doc.setLineWidth(0.35)
  doc.setDrawColor(60, 60, 60)
  doc.line(36, clotureY + 1.5, pageWidth - 12, clotureY + 1.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    `${passengerCount} passager${passengerCount !== 1 ? 's' : ''} — KAP FRET`,
    12,
    clotureY + 7,
  )
}

export async function generatePassengerManifestPdf(params: PassengerManifestParams): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadImageDataUrl(BRAND.logoSrc)
  const pageHeight = doc.internal.pageSize.getHeight()

  drawHeader(doc, params, logoDataUrl)

  const passengerRows = params.passengers.map((entry, index) => [
    String(index + 1),
    entry.ticket.passengerName,
    entry.ticket.ticketNumber,
    entry.ticket.category?.trim() || '—',
    formatGender(entry.ticket.gender),
    entry.observation,
  ])

  const rows = buildTableBodyRows(passengerRows, pageHeight)
  const singlePageManifest = passengerRows.length <= getMaxBodyRows(pageHeight)

  autoTable(doc, {
    startY: TABLE_START_Y,
    head: [['N°', 'NOMS PASSAGERS', 'N° BILLET', 'CATEGORIES', 'SEXE', 'OBSERVATIONS']],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2,
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
      valign: 'middle',
      minCellHeight: 6,
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: [40, 40, 40],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 58 },
      2: { cellWidth: 38, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 46 },
    },
    margin: { left: 12, right: 12, bottom: FOOTER_RESERVE_MM },
    showHead: singlePageManifest ? 'firstPage' : 'everyPage',
  })

  doc.setPage(singlePageManifest ? 1 : doc.getNumberOfPages())
  drawClosure(doc, params.passengers.length)

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
