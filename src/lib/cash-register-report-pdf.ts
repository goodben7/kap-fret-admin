import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import { CURRENCY, type Currency } from '@/constants/ticket'
import {
  getCashTransactionReferenceTypeLabel,
  sortCashTransactionsByOldestFirst,
  splitCashTransactionForReport,
} from '@/lib/cash-transaction'
import { cashTransactionService } from '@/services/cash-transaction.service'
import { downloadBlob } from '@/lib/passenger-manifest-pdf'
import { toIri } from '@/lib/hydra'
import type { CashRegisterResource } from '@/types/cash-register'
import type { CashTransaction } from '@/types/cash-transaction'

export { downloadBlob }

export interface CashRegisterReportDateRange {
  startDate: string
  endDate: string
}

export interface CashRegisterReportParams {
  register: CashRegisterResource
  transactions: CashTransaction[]
  reportDate: string
  dateRange: CashRegisterReportDateRange
  locationLabel?: string
}

const NAVY = { r: 11, g: 33, b: 61 }
const ORANGE = { r: 245, g: 124, b: 0 }
const HEADER_FILL: [number, number, number] = [252, 211, 177]
const OPENING_ROW_FILL: [number, number, number] = [245, 245, 245]

const MARGIN_X = 12
const FOOTER_HEIGHT_MM = 22
const LOGO_WIDTH_MM = 30
const LOGO_HEIGHT_MM = 18

/** Largeur utile A4 paysage (297 mm − marges gauche/droite) */
const USABLE_TABLE_WIDTH_MM = 297 - MARGIN_X * 2

const COLUMN_WIDTHS_MM = {
  date: 22,
  description: 58,
  entryUsd: 23,
  entryCdf: 23,
  exitUsd: 23,
  exitCdf: 23,
  balanceUsd: 24,
  balanceCdf: 24,
  observations: 53,
} as const

const TABLE_WIDTH_MM = USABLE_TABLE_WIDTH_MM

const HEADER_ROW_MM = 12
const ROW_HEIGHT_MM = 7
const MIN_EMPTY_ROWS_AFTER_DATA = 3

function formatReportDate(dateInput: string): string {
  const [year, month, day] = dateInput.split('-')
  if (!year || !month || !day) return dateInput
  return `${day}/${month}/${year}`
}

function formatReportDateTime(isoDate: string): string {
  const [datePart] = isoDate.split('T')
  return formatReportDate(datePart ?? isoDate)
}

function formatReportMoney(amount: number, currency: Currency): string {
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
  return formatReportMoney(amount, currency)
}

function formatBalanceCell(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount)) return '—'
  return formatReportMoney(amount, currency)
}

function emptyReportRow(): string[] {
  return ['', '', '', '', '', '', '', '', '']
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
  const emptyRow = emptyReportRow()

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

function buildTransactionObservation(transaction: CashTransaction): string {
  const refLabel = getCashTransactionReferenceTypeLabel(transaction.referenceType)
  if (transaction.referenceId?.trim()) {
    return `${refLabel} · ${transaction.referenceId}`
  }
  return refLabel
}

function parseTransactionDateOnly(isoDate: string): string {
  return isoDate.split('T')[0] ?? isoDate
}

function isTransactionInRange(
  transaction: CashTransaction,
  startDate: string,
  endDate: string,
): boolean {
  const date = parseTransactionDateOnly(transaction.transactionDate)
  return date >= startDate && date <= endDate
}

function isTransactionBeforeStart(transaction: CashTransaction, startDate: string): boolean {
  return parseTransactionDateOnly(transaction.transactionDate) < startDate
}

function computeRegisterOpeningBalances(register: CashRegisterResource): {
  soldeUsd: number
  soldeCdf: number
} {
  return {
    soldeUsd: parseFloat(register.openingBalanceUSD) || 0,
    soldeCdf: parseFloat(register.openingBalanceCDF) || 0,
  }
}

function applyTransactionToBalances(
  soldeUsd: number,
  soldeCdf: number,
  transaction: CashTransaction,
): { soldeUsd: number; soldeCdf: number } {
  const { entry, sortie } = splitCashTransactionForReport(transaction)
  return {
    soldeUsd: soldeUsd + entry.usd - sortie.usd,
    soldeCdf: soldeCdf + entry.cdf - sortie.cdf,
  }
}

interface ReportTableBuildResult {
  rows: string[][]
  openingRowIndex: number
}

function buildCashRegisterReportRows(
  register: CashRegisterResource,
  transactions: CashTransaction[],
  dateRange: CashRegisterReportDateRange,
): ReportTableBuildResult {
  const sorted = sortCashTransactionsByOldestFirst(transactions)
  const priorTransactions = sorted.filter((transaction) =>
    isTransactionBeforeStart(transaction, dateRange.startDate),
  )
  const periodTransactions = sorted.filter((transaction) =>
    isTransactionInRange(transaction, dateRange.startDate, dateRange.endDate),
  )

  let { soldeUsd, soldeCdf } = computeRegisterOpeningBalances(register)
  for (const transaction of priorTransactions) {
    const next = applyTransactionToBalances(soldeUsd, soldeCdf, transaction)
    soldeUsd = next.soldeUsd
    soldeCdf = next.soldeCdf
  }

  const rows: string[][] = []
  const openingLabel = priorTransactions.length > 0
    ? `Solde d'ouverture (au ${formatReportDate(dateRange.startDate)})`
    : "Solde d'ouverture"

  rows.push([
    formatReportDate(dateRange.startDate),
    openingLabel,
    '—',
    '—',
    '—',
    '—',
    formatBalanceCell(soldeUsd, CURRENCY.USD),
    formatBalanceCell(soldeCdf, CURRENCY.CDF),
    '',
  ])
  const openingRowIndex = 0

  for (const transaction of periodTransactions) {
    const { entry, sortie } = splitCashTransactionForReport(transaction)
    soldeUsd += entry.usd - sortie.usd
    soldeCdf += entry.cdf - sortie.cdf

    rows.push([
      formatReportDateTime(transaction.transactionDate),
      transaction.description?.trim() || '—',
      formatMoneyCell(entry.usd, CURRENCY.USD),
      formatMoneyCell(entry.cdf, CURRENCY.CDF),
      formatMoneyCell(sortie.usd, CURRENCY.USD),
      formatMoneyCell(sortie.cdf, CURRENCY.CDF),
      formatBalanceCell(soldeUsd, CURRENCY.USD),
      formatBalanceCell(soldeCdf, CURRENCY.CDF),
      buildTransactionObservation(transaction),
    ])
  }

  return { rows, openingRowIndex }
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

function drawHeader(doc: jsPDF, params: CashRegisterReportParams, logoDataUrl: string | null): number {
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
  doc.text(`DATE DU RAPPORT : ${formatReportDate(params.reportDate)}`, rightX, topY + 3, {
    align: 'right',
  })
  doc.text(`CAISSE : ${params.register.code}`, rightX, topY + 9, { align: 'right' })
  doc.text(
    `PÉRIODE : ${formatReportDate(params.dateRange.startDate)} – ${formatReportDate(params.dateRange.endDate)}`,
    rightX,
    topY + 15,
    { align: 'right' },
  )

  drawBrandTitle(doc, centerX, topY + 10)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b)
  doc.text('RAPPORT DE CAISSE', centerX, topY + 18, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0)
  doc.text(params.register.name.toUpperCase(), centerX, topY + 25, { align: 'center' })

  return topY + 32
}

function drawFooter(doc: jsPDF, params: CashRegisterReportParams) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const blockRight = pageWidth - MARGIN_X
  const blockWidth = 98
  const blockLeft = blockRight - blockWidth
  const signatureLineY = pageHeight - FOOTER_HEIGHT_MM + 4
  const labelY = signatureLineY + 5
  const faitY = signatureLineY - 7
  const location = (params.locationLabel ?? 'KINSHASA').toUpperCase()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `FAIT A ${location}, LE ${formatReportDate(params.reportDate)}`,
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

export async function generateCashRegisterReportPdf(params: CashRegisterReportParams): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadImageDataUrl(BRAND.logoSrc)
  const pageHeight = doc.internal.pageSize.getHeight()
  const tableStartY = drawHeader(doc, params, logoDataUrl)

  const { rows: dataRows, openingRowIndex } = buildCashRegisterReportRows(
    params.register,
    params.transactions,
    params.dateRange,
  )
  const rows = buildTableBodyRows(dataRows, pageHeight, tableStartY)
  const singlePage = dataRows.length <= getMaxBodyRows(pageHeight, tableStartY)

  autoTable(doc, {
    startY: tableStartY,
    tableWidth: TABLE_WIDTH_MM,
    head: [
      [
        { content: 'DATE', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'Description', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'ENTREE', colSpan: 2, styles: { halign: 'center' } },
        { content: 'SORTIE', colSpan: 2, styles: { halign: 'center' } },
        { content: 'SOLDE', colSpan: 2, styles: { halign: 'center' } },
        { content: 'OBSERVATIONS', rowSpan: 2, styles: { valign: 'middle' } },
      ],
      ['USD', 'CDF', 'USD', 'CDF', 'USD', 'CDF'],
    ],
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
      0: { cellWidth: COLUMN_WIDTHS_MM.date, halign: 'center' },
      1: { cellWidth: COLUMN_WIDTHS_MM.description },
      2: { cellWidth: COLUMN_WIDTHS_MM.entryUsd, halign: 'right' },
      3: { cellWidth: COLUMN_WIDTHS_MM.entryCdf, halign: 'right' },
      4: { cellWidth: COLUMN_WIDTHS_MM.exitUsd, halign: 'right' },
      5: { cellWidth: COLUMN_WIDTHS_MM.exitCdf, halign: 'right' },
      6: { cellWidth: COLUMN_WIDTHS_MM.balanceUsd, halign: 'right' },
      7: { cellWidth: COLUMN_WIDTHS_MM.balanceCdf, halign: 'right' },
      8: { cellWidth: COLUMN_WIDTHS_MM.observations },
    },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: FOOTER_HEIGHT_MM },
    showHead: singlePage ? 'firstPage' : 'everyPage',
    didParseCell: (data) => {
      if (data.section !== 'body' || data.row.index !== openingRowIndex) return
      data.cell.styles.fontStyle = 'bold'
      data.cell.styles.fillColor = OPENING_ROW_FILL
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    drawFooter(doc, params)
  }

  return doc.output('blob')
}

export function buildCashRegisterReportFileName(
  register: Pick<CashRegisterResource, 'code'>,
  dateRange: CashRegisterReportDateRange,
): string {
  const start = dateRange.startDate.replace(/-/g, '')
  const end = dateRange.endDate.replace(/-/g, '')
  const code = register.code.trim().replace(/\s+/g, '_').toUpperCase()
  return `RAPPORT_CAISSE_${code}_${start}_${end}.pdf`
}

export async function fetchAndGenerateCashRegisterReportPdf(
  register: CashRegisterResource,
  dateRange: CashRegisterReportDateRange,
  reportDate: string,
): Promise<{ blob: Blob; fileName: string; transactionCount: number }> {
  const cashRegisterIri = toIri('cash_registers', register.id)
  const transactions = await cashTransactionService.getAllForReport({ cashRegister: cashRegisterIri })
  const periodCount = sortCashTransactionsByOldestFirst(transactions).filter((transaction) =>
    isTransactionInRange(transaction, dateRange.startDate, dateRange.endDate),
  ).length

  const blob = await generateCashRegisterReportPdf({
    register,
    transactions,
    reportDate,
    dateRange,
  })
  return {
    blob,
    fileName: buildCashRegisterReportFileName(register, dateRange),
    transactionCount: periodCount,
  }
}
