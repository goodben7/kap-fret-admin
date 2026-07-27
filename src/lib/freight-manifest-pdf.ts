import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import { FREIGHT_PAYMENT_MODE } from '@/constants/freight'
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
const HEADER_FILL: [number, number, number] = [146, 208, 80]
const SUMMARY_FILL: [number, number, number] = [189, 215, 238]
const TOTAL_RED: [number, number, number] = [192, 0, 0]
const NET_BLUE: [number, number, number] = [0, 51, 153]

const MARGIN_X = 8
const FOOTER_HEIGHT_MM = 28
const LOGO_WIDTH_MM = 28
const LOGO_HEIGHT_MM = 16

const USABLE_TABLE_WIDTH_MM = 297 - MARGIN_X * 2

/** 18 colonnes — total = USABLE_TABLE_WIDTH_MM (281 mm) */
const COLUMN_WIDTHS_MM = {
  lta: 16,
  sender: 36,
  receiver: 36,
  packages: 10,
  weightsPerPackage: 18,
  totalKg: 12,
  unitPrice: 10,
  totalAmount: 14,
  netUsd: 12,
  netCdf: 14,
  cash: 10,
  partial: 9,
  arrival: 9,
  soldeUsd: 12,
  soldeCdf: 14,
  resteMnt: 12,
  resteSolde: 12,
  obs: 25,
} as const

const TABLE_WIDTH_MM = USABLE_TABLE_WIDTH_MM
const HEADER_ROW_MM = 14
const ROW_HEIGHT_MM = 6.5
const MIN_EMPTY_ROWS_AFTER_DATA = 2
const COLUMN_COUNT = 18
const DASH = '--'

function formatManifestDate(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

function formatWeightPart(value: string | number | undefined): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  if (Number.isNaN(num)) return '0'
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(2).replace(/\.?0+$/, '')
}

function formatKgCell(value: string | number | undefined): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  if (Number.isNaN(num)) return DASH
  return formatWeightPart(num)
}

function formatMoneyPlain(amount: number, currency: Currency): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const formatted = safeAmount.toLocaleString('fr-FR', {
    minimumFractionDigits: currency === CURRENCY.USD ? 0 : 0,
    maximumFractionDigits: currency === CURRENCY.USD ? 2 : 0,
  })
  return formatted.replace(/[\u00A0\u202F]/g, ' ')
}

function formatAmountOrDash(amount: number, currency: Currency, withSymbol = false): string {
  if (!Number.isFinite(amount) || amount === 0) return DASH
  const plain = formatMoneyPlain(amount, currency)
  if (!withSymbol) return plain
  return currency === CURRENCY.USD ? `${plain} $` : `${plain} Fc`
}

function formatUnitPrice(totalAmount: number, totalWeight: number): string {
  if (!Number.isFinite(totalAmount) || !Number.isFinite(totalWeight) || totalWeight <= 0) return DASH
  const unit = totalAmount / totalWeight
  return formatWeightPart(Math.round(unit * 100) / 100)
}

function packagesWeightsLabel(shipment: FreightShipment): string {
  const packages = shipment.packages ?? []
  if (packages.length === 0) {
    return formatKgCell(shipment.totalWeight)
  }
  return packages.map((pkg) => formatWeightPart(pkg.totalWeight)).join('+')
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

interface ManifestTableBuildResult {
  rows: string[][]
  summaryRowIndex: number
}

function buildFreightManifestRows(shipments: FreightShipment[]): ManifestTableBuildResult {
  const rows: string[][] = []
  let runningNetUsd = 0
  let runningNetCdf = 0
  let runningReste = 0
  let totalPackages = 0
  let totalKg = 0
  let totalAmountUsd = 0
  let totalAmountCdf = 0
  let totalPaidUsd = 0
  let totalPaidCdf = 0
  let totalReste = 0

  for (const shipment of shipments) {
    const currency = getFreightCurrency(shipment)
    const totalWeight = parseFloat(shipment.totalWeight) || 0
    const totalAmount = parseFloat(shipment.totalAmount) || 0
    const paidAmount = parseFloat(shipment.paidAmount) || 0
    const remainingAmount = parseFloat(shipment.remainingAmount) || 0
    const packageCount = shipment.packageCount ?? (shipment.packages?.length ?? 0)

    totalPackages += packageCount
    totalKg += totalWeight
    totalReste += remainingAmount

    if (currency === CURRENCY.USD) {
      totalAmountUsd += totalAmount
      totalPaidUsd += paidAmount
      runningNetUsd += paidAmount
    } else {
      totalAmountCdf += totalAmount
      totalPaidCdf += paidAmount
      runningNetCdf += paidAmount
    }
    runningReste += remainingAmount

    const isCash = shipment.paymentMode === FREIGHT_PAYMENT_MODE.CASH
    const isPartial = shipment.paymentMode === FREIGHT_PAYMENT_MODE.PARTIAL
    const isArrival = shipment.paymentMode === FREIGHT_PAYMENT_MODE.AT_ARRIVAL

    const netUsd = currency === CURRENCY.USD ? formatAmountOrDash(paidAmount, CURRENCY.USD) : DASH
    const netCdf = currency === CURRENCY.CDF ? formatAmountOrDash(paidAmount, CURRENCY.CDF) : DASH
    const totalDisplay = currency === CURRENCY.USD
      ? formatAmountOrDash(totalAmount, CURRENCY.USD, true)
      : formatAmountOrDash(totalAmount, CURRENCY.CDF, true)

    rows.push([
      shipment.ltaNumber?.trim() || DASH,
      shipment.senderName?.trim() || DASH,
      shipment.receiverName?.trim() || DASH,
      packageCount > 0 ? String(packageCount) : DASH,
      packagesWeightsLabel(shipment),
      formatKgCell(totalWeight),
      formatUnitPrice(totalAmount, totalWeight),
      totalDisplay,
      netUsd,
      netCdf,
      isCash ? 'CASH' : '',
      isPartial ? 'P. D' : '',
      isArrival ? 'ACC' : '',
      formatAmountOrDash(runningNetUsd, CURRENCY.USD),
      formatAmountOrDash(runningNetCdf, CURRENCY.CDF),
      formatAmountOrDash(remainingAmount, currency),
      formatAmountOrDash(runningReste, currency),
      shipment.observations?.trim() || '',
    ])
  }

  const ltaCount = String(shipments.length).padStart(2, '0')
  const totalAmountLabel = [
    totalAmountUsd > 0 ? formatAmountOrDash(totalAmountUsd, CURRENCY.USD, true) : null,
    totalAmountCdf > 0 ? formatAmountOrDash(totalAmountCdf, CURRENCY.CDF, true) : null,
  ].filter(Boolean).join(' / ') || DASH

  rows.push([
    ltaCount,
    '',
    '',
    totalPackages > 0 ? String(totalPackages) : DASH,
    '',
    totalKg > 0 ? `${formatWeightPart(totalKg)}Kgs` : DASH,
    '',
    totalAmountLabel,
    formatAmountOrDash(totalPaidUsd, CURRENCY.USD),
    formatAmountOrDash(totalPaidCdf, CURRENCY.CDF),
    '',
    '',
    '',
    formatAmountOrDash(totalPaidUsd, CURRENCY.USD),
    formatAmountOrDash(totalPaidCdf, CURRENCY.CDF),
    formatAmountOrDash(totalReste, CURRENCY.USD),
    formatAmountOrDash(totalReste, CURRENCY.USD),
    '',
  ])

  return { rows, summaryRowIndex: rows.length - 1 }
}

function drawBrandTitle(doc: jsPDF, centerX: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)

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
  const topY = 8

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_X, topY, LOGO_WIDTH_MM, LOGO_HEIGHT_MM)
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text('AGENCE KAP – FRET', centerX, topY + 6, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('RAPPORT MANIFESTE FRET EXPÉDIÉ', centerX, topY + 13, { align: 'center' })

  drawBrandTitle(doc, centerX, topY + 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`Date du VOL : ${formatManifestDate(params.shipmentDate)}`, rightX, topY + 6, {
    align: 'right',
  })
  doc.setFont('helvetica', 'bold')
  doc.text(
    `TRAJET : ${params.departureLabel.toUpperCase()} - ${params.destinationLabel.toUpperCase()}`,
    rightX,
    topY + 13,
    { align: 'right' },
  )

  return topY + 28
}

function drawFooter(doc: jsPDF, params: FreightManifestParams) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const y = pageHeight - FOOTER_HEIGHT_MM + 6
  const leftX = MARGIN_X + 20
  const rightX = pageWidth - MARGIN_X - 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text("CHEF D'AGENCE", leftX, y, { align: 'center' })
  doc.text('CHARGER DE FRET', rightX, y, { align: 'center' })

  doc.setLineWidth(0.3)
  doc.setDrawColor(60, 60, 60)
  doc.line(leftX - 28, y + 10, leftX + 28, y + 10)
  doc.line(rightX - 28, y + 10, rightX + 28, y + 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    `FAIT À ${params.departureLabel.toUpperCase()}, LE ${formatManifestDate(params.shipmentDate)}`,
    pageWidth - MARGIN_X,
    pageHeight - 6,
    { align: 'right' },
  )
}

export async function generateFreightManifestPdf(params: FreightManifestParams): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadImageDataUrl(BRAND.logoSrc)
  const pageHeight = doc.internal.pageSize.getHeight()
  const tableStartY = drawHeader(doc, params, logoDataUrl)

  const { rows: dataRows, summaryRowIndex } = buildFreightManifestRows(params.shipments)
  const rows = buildTableBodyRows(dataRows, pageHeight, tableStartY)
  const singlePage = dataRows.length <= getMaxBodyRows(pageHeight, tableStartY)

  autoTable(doc, {
    startY: tableStartY,
    tableWidth: TABLE_WIDTH_MM,
    head: [
      [
        { content: 'LTA', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'EXPÉDITEUR', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'DESTINATAIRE', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'NBR.\nDE COLIS', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'PODS\nPAR COLIS', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'TOTAL\nKgs', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'P. U', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'TOTAL\nEN $', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'NET PAYER', colSpan: 2, styles: { halign: 'center' } },
        { content: 'ETATS', colSpan: 3, styles: { halign: 'center' } },
        { content: 'SOLDE', colSpan: 2, styles: { halign: 'center' } },
        { content: 'RESTE', colSpan: 2, styles: { halign: 'center' } },
        { content: 'OBS.', rowSpan: 2, styles: { valign: 'middle' } },
      ],
      [
        'USD',
        'CDF',
        'CASH',
        'P. D',
        'ACC',
        'USD',
        'CDF',
        'MNT',
        'SOLDE',
      ],
    ],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6,
      cellPadding: 1,
      lineColor: [40, 40, 40],
      lineWidth: 0.2,
      valign: 'middle',
      minCellHeight: 5.5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 5.5,
      cellPadding: 1,
    },
    columnStyles: {
      0: { cellWidth: COLUMN_WIDTHS_MM.lta, halign: 'center' },
      1: { cellWidth: COLUMN_WIDTHS_MM.sender, halign: 'left' },
      2: { cellWidth: COLUMN_WIDTHS_MM.receiver, halign: 'left' },
      3: { cellWidth: COLUMN_WIDTHS_MM.packages, halign: 'center' },
      4: { cellWidth: COLUMN_WIDTHS_MM.weightsPerPackage, halign: 'center' },
      5: { cellWidth: COLUMN_WIDTHS_MM.totalKg, halign: 'center' },
      6: { cellWidth: COLUMN_WIDTHS_MM.unitPrice, halign: 'center' },
      7: { cellWidth: COLUMN_WIDTHS_MM.totalAmount, halign: 'right' },
      8: { cellWidth: COLUMN_WIDTHS_MM.netUsd, halign: 'right' },
      9: { cellWidth: COLUMN_WIDTHS_MM.netCdf, halign: 'right' },
      10: { cellWidth: COLUMN_WIDTHS_MM.cash, halign: 'center' },
      11: { cellWidth: COLUMN_WIDTHS_MM.partial, halign: 'center' },
      12: { cellWidth: COLUMN_WIDTHS_MM.arrival, halign: 'center' },
      13: { cellWidth: COLUMN_WIDTHS_MM.soldeUsd, halign: 'right' },
      14: { cellWidth: COLUMN_WIDTHS_MM.soldeCdf, halign: 'right' },
      15: { cellWidth: COLUMN_WIDTHS_MM.resteMnt, halign: 'right' },
      16: { cellWidth: COLUMN_WIDTHS_MM.resteSolde, halign: 'right' },
      17: { cellWidth: COLUMN_WIDTHS_MM.obs, halign: 'left' },
    },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: FOOTER_HEIGHT_MM },
    showHead: singlePage ? 'firstPage' : 'everyPage',
    didParseCell: (data) => {
      if (data.section !== 'body') return

      if (data.row.index === summaryRowIndex) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = SUMMARY_FILL
        if (data.column.index === 7) {
          data.cell.styles.textColor = TOTAL_RED
        }
        if ([8, 9, 13, 14, 15, 16].includes(data.column.index)) {
          data.cell.styles.textColor = NET_BLUE
        }
        return
      }

      if (data.column.index === 7 && data.cell.raw) {
        data.cell.styles.textColor = TOTAL_RED
        data.cell.styles.fontStyle = 'bold'
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
  params: Pick<FreightManifestParams, 'departureLabel' | 'departureCode' | 'destinationCode' | 'shipmentDate'>,
): string {
  const place = (params.departureLabel || params.departureCode || 'FRET')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
  return `RAPPORT_MANIFESTE_FRET_EXPEDIE_${place}.pdf`
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
