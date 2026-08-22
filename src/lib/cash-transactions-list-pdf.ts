import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '@/constants/brand'
import {
  getCashTransactionCurrencyCode,
  getCashTransactionReferenceTypeLabel,
  getCashTransactionStatusLabel,
  getCashTransactionTypeLabel,
} from '@/lib/cash-transaction'
import { downloadBlob } from '@/lib/passenger-manifest-pdf'
import { formatDateTime, formatMoney } from '@/lib/utils'
import type { CashTransaction } from '@/types/cash-transaction'
import { CURRENCY } from '@/constants/ticket'

export interface CashTransactionsListPdfParams {
  transactions: CashTransaction[]
  title?: string
  filtersLabel?: string
}

export function downloadCashTransactionsListPdf({
  transactions,
  title = 'Mouvements financiers',
  filtersLabel,
}: CashTransactionsListPdfParams): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const marginX = 12
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(BRAND.name, marginX, y)
  y += 7
  doc.setFontSize(12)
  doc.text(title, marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Généré le ${formatDateTime(new Date().toISOString())} — ${transactions.length} ligne(s)`, marginX, y)
  y += 5
  if (filtersLabel) {
    doc.text(filtersLabel, marginX, y)
    y += 6
  } else {
    y += 2
  }

  const rows = transactions.map((tx) => {
    const currency = getCashTransactionCurrencyCode(tx.currency)
      ?? getCashTransactionCurrencyCode(tx.transactionCurrency)
      ?? CURRENCY.USD
    const amount = parseFloat(tx.transactionAmount ?? tx.amount ?? '0') || 0
    return [
      tx.id,
      getCashTransactionTypeLabel(tx.type),
      formatMoney(amount, currency),
      currency,
      getCashTransactionReferenceTypeLabel(tx.referenceType),
      tx.referenceId ?? '—',
      getCashTransactionStatusLabel(tx.status ?? ''),
      tx.transactionDate ? formatDateTime(tx.transactionDate) : '—',
      (tx.description ?? '').slice(0, 60),
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['ID', 'Type', 'Montant', 'Devise', 'Réf.', 'ID réf.', 'Statut', 'Date', 'Description']],
    body: rows,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [11, 33, 61], textColor: 255 },
    margin: { left: marginX, right: marginX },
  })

  const blob = doc.output('blob')
  downloadBlob(blob, `mouvements-financiers-${new Date().toISOString().slice(0, 10)}.pdf`)
}
