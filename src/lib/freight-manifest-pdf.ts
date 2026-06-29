import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import { FREIGHT_PAYMENT_MODE_LABELS, type FreightPaymentMode } from '@/constants/freight'
import { buildFreightManifestFilters } from '@/lib/freight-filters'
import {
  filterFreightShipmentsForManifest,
  getFreightCurrency,
  sortFreightShipmentsForManifest,
} from '@/lib/freight'
import { freightService } from '@/services/freight.service'
import type { FreightShipment } from '@/types/freight-shipment'
import {
  buildManifestNumber,
  downloadBlob,
} from '@/lib/passenger-manifest-pdf'
import { CURRENCY, type Currency } from '@/constants/ticket'

export { downloadBlob }

export interface FreightManifestParams {
  departureLabel: string
  destinationLabel: string
  departureCode: string
  destinationCode: string
  shipmentDate: string
  flightNumber: string
  shipments: FreightShipment[]
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

const COLUMN_COUNT = 13

/** Largeurs colonnes (mm) — total = USABLE_TABLE_WIDTH_MM */
const COLUMN_WIDTHS_MM = {
  index: 8,
  senderNumber: 30,
  receiver: 30,
  lta: 22,
  packages: 14,
  totalWeight: 18,
  totalAmount: 22,
  balanceTotal: 22,
  paidAmount: 20,
  balancePaid: 22,
  remainingAmount: 20,
  balanceRemaining: 22,
  paymentMode: 23,
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

function getPaymentModeLabel(mode: string): string {
  if (mode in FREIGHT_PAYMENT_MODE_LABELS) {
    return FREIGHT_PAYMENT_MODE_LABELS[mode as FreightPaymentMode]
  }
  return mode || '—'
}

function groupShipmentsByCurrency(shipments: FreightShipment[]): Map<Currency, FreightShipment[]> {
  const groups = new Map<Currency, FreightShipment[]>(
    MANIFEST_CURRENCY_ORDER.map((currency) => [currency, []]),
  )

  for (const shipment of shipments) {
    const currency = getFreightCurrency(shipment)
    const list = groups.get(currency) ?? []
    list.push(shipment)
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

export async function fetchFreightShipmentsForManifest(
  loadingPlace: string,
  unloadingPlace: string,
  shipmentDate: string,
): Promise<FreightShipment[]> {
  const filters = buildFreightManifestFilters(loadingPlace, unloadingPlace, shipmentDate)
  const { items } = await freightService.getAll(filters)
  return sortFreightShipmentsForManifest(filterFreightShipmentsForManifest(items))
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

interface CurrencyTotals {
  totalAmount: number
  paidAmount: number
  remainingAmount: number
}

function buildFreightManifestRows(shipments: FreightShipment[]): ManifestTableBuildResult {
  const groups = groupShipmentsByCurrency(shipments)
  const rows: string[][] = []
  const totalRowIndexes = new Set<number>()
  const totalsByCurrency = new Map<Currency, CurrencyTotals>()
  let rowIndex = 0
  let globalIndex = 0

  for (const currency of MANIFEST_CURRENCY_ORDER) {
    const group = groups.get(currency) ?? []
    if (group.length === 0) continue

    let runningTotalAmount = 0
    let runningPaidAmount = 0
    let runningRemainingAmount = 0

    for (const shipment of group) {
      globalIndex += 1
      const totalAmount = parseFloat(shipment.totalAmount) || 0
      const paidAmount = parseFloat(shipment.paidAmount) || 0
      const remainingAmount = parseFloat(shipment.remainingAmount) || 0
      runningTotalAmount += totalAmount
      runningPaidAmount += paidAmount
      runningRemainingAmount += remainingAmount

      rows.push([
        String(globalIndex),
        shipment.senderName?.trim() || '—',
        shipment.receiverName?.trim() || '—',
        shipment.ltaNumber?.trim() || '—',
        String(shipment.packageCount ?? 0),
        formatKgCell(shipment.totalWeight),
        formatMoneyCell(totalAmount, currency),
        formatMoneyCell(runningTotalAmount, currency),
        formatMoneyCell(paidAmount, currency),
        formatMoneyCell(runningPaidAmount, currency),
        formatMoneyCell(remainingAmount, currency),
        formatMoneyCell(runningRemainingAmount, currency),
        getPaymentModeLabel(shipment.paymentMode),
      ])
      rowIndex += 1
    }

    totalsByCurrency.set(currency, {
      totalAmount: runningTotalAmount,
      paidAmount: runningPaidAmount,
      remainingAmount: runningRemainingAmount,
    })
  }

  for (const currency of MANIFEST_CURRENCY_ORDER) {
    const totals = totalsByCurrency.get(currency)
    if (totals == null) continue

    rows.push([
      '',
      `TOTAL ${currency}`,
      '',
      '',
      '',
      '',
      formatTotalMoneyCell(totals.totalAmount, currency),
      formatTotalMoneyCell(totals.totalAmount, currency),
      formatTotalMoneyCell(totals.paidAmount, currency),
      formatTotalMoneyCell(totals.paidAmount, currency),
      formatTotalMoneyCell(totals.remainingAmount, currency),
      formatTotalMoneyCell(totals.remainingAmount, currency),
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
  params: FreightManifestParams,
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
  doc.text(`DATE EXPEDITION : ${formatManifestDate(params.shipmentDate)}`, rightX, topY + 3, {
    align: 'right',
  })
  doc.text(`N° DU VOL : ${params.flightNumber}`, rightX, topY + 9, { align: 'right' })

  drawBrandTitle(doc, centerX, topY + 10)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text(
    `MANIFESTE FRET ${params.departureLabel.toUpperCase()}`,
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

function drawFooter(doc: jsPDF, params: FreightManifestParams) {
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
    `FAIT À ${params.departureLabel.toUpperCase()}, LE ${formatManifestDate(params.shipmentDate)}`,
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

export async function generateFreightManifestPdf(params: FreightManifestParams): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadImageDataUrl(BRAND.logoSrc)
  const pageHeight = doc.internal.pageSize.getHeight()
  const tableStartY = drawHeader(doc, params, logoDataUrl)

  const { rows: dataRows, totalRowIndexes } = buildFreightManifestRows(params.shipments)
  const rows = buildTableBodyRows(dataRows, pageHeight, tableStartY)
  const singlePage = dataRows.length <= getMaxBodyRows(pageHeight, tableStartY)

  autoTable(doc, {
    startY: tableStartY,
    tableWidth: TABLE_WIDTH_MM,
    head: [[
      'N°',
      'EXPEDITEUR',
      'DESTINATAIRE',
      'LTA',
      'COLIS',
      'POIDS\nTOTAL',
      'MONTANT\nTOTAL',
      'SOLDE',
      'MONTANT\nPAYE',
      'SOLDE',
      'RESTE\nA PAYER',
      'SOLDE',
      'MODE\nPAIEMENT',
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
      1: { cellWidth: COLUMN_WIDTHS_MM.senderNumber },
      2: { cellWidth: COLUMN_WIDTHS_MM.receiver },
      3: { cellWidth: COLUMN_WIDTHS_MM.lta, halign: 'center' },
      4: { cellWidth: COLUMN_WIDTHS_MM.packages, halign: 'right' },
      5: { cellWidth: COLUMN_WIDTHS_MM.totalWeight, halign: 'right' },
      6: { cellWidth: COLUMN_WIDTHS_MM.totalAmount, halign: 'right' },
      7: { cellWidth: COLUMN_WIDTHS_MM.balanceTotal, halign: 'right' },
      8: { cellWidth: COLUMN_WIDTHS_MM.paidAmount, halign: 'right' },
      9: { cellWidth: COLUMN_WIDTHS_MM.balancePaid, halign: 'right' },
      10: { cellWidth: COLUMN_WIDTHS_MM.remainingAmount, halign: 'right' },
      11: { cellWidth: COLUMN_WIDTHS_MM.balanceRemaining, halign: 'right' },
      12: { cellWidth: COLUMN_WIDTHS_MM.paymentMode, halign: 'center' },
    },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: FOOTER_HEIGHT_MM },
    showHead: singlePage ? 'firstPage' : 'everyPage',
    didParseCell: (data) => {
      if (data.section !== 'body' || !totalRowIndexes.has(data.row.index)) return
      data.cell.styles.fontStyle = 'bold'
      data.cell.styles.fillColor = [245, 245, 245]
      const amountColumns = new Set([6, 7, 8, 9, 10, 11])
      if (data.column.index === 1) {
        data.cell.styles.halign = 'left'
      } else if (amountColumns.has(data.column.index)) {
        data.cell.styles.halign = 'right'
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

export function buildFreightManifestFileName(
  params: Pick<FreightManifestParams, 'departureCode' | 'destinationCode' | 'shipmentDate'>,
): string {
  const date = params.shipmentDate.replace(/-/g, '')
  return `MANIFESTE_FRET_${params.departureCode}_${params.destinationCode}_${date}.pdf`
}

export function resolveFreightManifestFlightNumber(
  shipmentDate: string,
  departureCode: string,
  destinationCode: string,
  flightNumber?: string,
): string {
  const trimmed = flightNumber?.trim()
  if (trimmed) return trimmed
  return buildManifestNumber(shipmentDate, departureCode, destinationCode)
}
