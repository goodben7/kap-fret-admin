import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  FileText,
  Pencil,
  Receipt,
  Wallet,
} from 'lucide-react'
import { useCashRegister } from '@/hooks/useCashRegisters'
import { useCashTransactions } from '@/hooks/useCashTransactions'
import { CashRegisterReportModal } from '@/components/cash-registers/CashRegisterReportModal'
import { CashTransactionStatusActions } from '@/components/cash-transactions/CashTransactionStatusActions'
import { CashTransactionStatusBadge } from '@/components/cash-transactions/CashTransactionStatusBadge'
import { parseCashRegisterBalance } from '@/lib/cash-register'
import { CURRENCY } from '@/constants/ticket'
import {
  cashTransactionReferencePath,
  canChangeCashTransactionStatus,
  getCashTransactionCashRegisterIri,
  getCashTransactionCashRegisterLabel,
  getCashTransactionCurrencyCode,
  getCashTransactionReferenceTypeLabel,
  getCashTransactionTypeLabel,
} from '@/lib/cash-transaction'
import { CASH_TRANSACTION_TYPE } from '@/constants/cash-transaction'
import { toIri } from '@/lib/hydra'
import type { CashTransaction } from '@/types/cash-transaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn, formatDate, formatDateTime, formatMoney } from '@/lib/utils'

const ITEMS_PER_PAGE = 20

function DetailRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className={cn('break-words text-right text-sm font-medium', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  )
}

function formatTransactionTime(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function TransactionTypeBadge({ type }: { type: CashTransaction['type'] }) {
  if (type === CASH_TRANSACTION_TYPE.TRANSFER) {
    return (
      <Badge variant="secondary" className="gap-1">
        <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
        {getCashTransactionTypeLabel(type)}
      </Badge>
    )
  }
  const isEntry = type === CASH_TRANSACTION_TYPE.ENTRY
  return (
    <Badge variant={isEntry ? 'success' : 'destructive'} className="gap-1">
      {isEntry ? <ArrowDownLeft className="h-3 w-3" aria-hidden="true" /> : <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
      {getCashTransactionTypeLabel(type)}
    </Badge>
  )
}

function TransactionAmounts({
  transaction,
  registerIri,
}: {
  transaction: CashTransaction
  registerIri?: string
}) {
  const isTransfer = transaction.type === CASH_TRANSACTION_TYPE.TRANSFER
  const isEntry = transaction.type === CASH_TRANSACTION_TYPE.ENTRY
  const sourceIri = getCashTransactionCashRegisterIri(transaction.cashRegister)
  const destinationIri = getCashTransactionCashRegisterIri(transaction.destinationCashRegister)
  const isIncomingTransfer = isTransfer && !!registerIri && destinationIri === registerIri
  const isOutgoingTransfer = isTransfer && !!registerIri && sourceIri === registerIri
  const amountCode = getCashTransactionCurrencyCode(transaction.currency) ?? 'USD'
  const txCode = getCashTransactionCurrencyCode(transaction.transactionCurrency) ?? amountCode
  const amount = parseFloat(transaction.amount) || 0
  const txAmount = parseFloat(transaction.transactionAmount) || 0
  const showTxLine = txCode !== amountCode || transaction.transactionAmount !== transaction.amount

  const signedPositive = isIncomingTransfer || (!isTransfer && isEntry)
  const signedNegative = isOutgoingTransfer || (!isTransfer && !isEntry)

  return (
    <div className="space-y-0.5 text-right">
      <p
        className={cn(
          'text-sm font-bold tabular-nums tracking-tight',
          signedPositive ? 'text-emerald-700' : signedNegative ? 'text-destructive' : 'text-foreground',
        )}
      >
        {signedPositive ? '+' : signedNegative ? '−' : ''}
        {formatMoney(amount, amountCode)}
      </p>
      {showTxLine && (
        <p className="text-[11px] text-muted-foreground tabular-nums">
          Opération : {formatMoney(txAmount, txCode)}
        </p>
      )}
    </div>
  )
}

function TransactionReference({ transaction }: { transaction: CashTransaction }) {
  const path = cashTransactionReferencePath(transaction.referenceType, transaction.referenceId)
  const label = getCashTransactionReferenceTypeLabel(transaction.referenceType)

  if (!path) {
    return (
      <span className="text-xs text-muted-foreground">
        {label}
        {transaction.referenceId ? (
          <>
            {' · '}
            <span className="font-mono">{transaction.referenceId}</span>
          </>
        ) : null}
      </span>
    )
  }

  return (
    <Link
      to={path}
      className="text-xs font-medium text-muted-foreground transition-colors hover:text-brand-orange"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
      {transaction.referenceId ? (
        <>
          {' · '}
          <span className="font-mono">{transaction.referenceId}</span>
        </>
      ) : null}
    </Link>
  )
}

function TransactionOperationCell({
  transaction,
  registerIri,
}: {
  transaction: CashTransaction
  registerIri?: string
}) {
  const isTransfer = transaction.type === CASH_TRANSACTION_TYPE.TRANSFER
  const sourceLabel = getCashTransactionCashRegisterLabel(transaction.cashRegister)
  const destinationLabel = getCashTransactionCashRegisterLabel(transaction.destinationCashRegister)
  const isIncoming = isTransfer && !!registerIri
    && getCashTransactionCashRegisterIri(transaction.destinationCashRegister) === registerIri

  return (
    <div className="min-w-0 space-y-1.5">
      <TransactionTypeBadge type={transaction.type} />
      <p className="truncate text-sm font-semibold leading-snug" title={transaction.description || undefined}>
        {transaction.description?.trim()
          || (isTransfer
            ? (isIncoming ? `Transfert reçu de ${sourceLabel}` : `Transfert vers ${destinationLabel}`)
            : '—')}
      </p>
      {isTransfer ? (
        <p className="text-xs text-muted-foreground">
          {sourceLabel} → {destinationLabel}
        </p>
      ) : (
        <TransactionReference transaction={transaction} />
      )}
    </div>
  )
}

function TransactionCard({
  transaction,
  registerIri,
}: {
  transaction: CashTransaction
  registerIri?: string
}) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer rounded-2xl border-border/80 shadow-sm transition-colors hover:border-brand-orange/30 lg:hidden"
      onClick={() => void navigate(`/cash-transactions/${transaction.id}`)}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CashTransactionStatusBadge transaction={transaction} />
            </div>
            <TransactionOperationCell transaction={transaction} registerIri={registerIri} />
          </div>
          <TransactionAmounts transaction={transaction} registerIri={registerIri} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>{formatDateTime(transaction.transactionDate)}</span>
        </div>
        {canChangeCashTransactionStatus(transaction) && (
          <div className="border-t border-border/60 pt-3" onClick={(e) => e.stopPropagation()}>
            <CashTransactionStatusActions transaction={transaction} layout="buttons" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CashRegisterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const registerId = id ?? ''
  const [page, setPage] = useState(1)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  const { data: register, isLoading } = useCashRegister(registerId)
  const cashRegisterIri = register ? toIri('cash_registers', register.id) : undefined

  const { data: transactionsData, isLoading: transactionsLoading } = useCashTransactions(
    {
      cashRegister: cashRegisterIri,
      page,
      itemsPerPage: ITEMS_PER_PAGE,
    },
    { enabled: !!cashRegisterIri },
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement..." />
      </div>
    )
  }

  if (!register) {
    return (
      <EmptyState
        icon={Wallet}
        title="Registre introuvable"
        description="Ce registre n'existe pas ou a été supprimé."
        action={{ label: 'Retour à la liste', onClick: () => { window.location.href = '/admin/cash-registers' } }}
      />
    )
  }

  const usdBalance = parseCashRegisterBalance(register.currentBalanceUSD)
  const cdfBalance = parseCashRegisterBalance(register.currentBalanceCDF)
  const moneyUsd = (amount: number) => formatMoney(amount, CURRENCY.USD)
  const moneyCdf = (amount: number) => formatMoney(amount, CURRENCY.CDF)
  const transactions = transactionsData?.items ?? []
  const totalTransactions = transactionsData?.totalItems ?? 0

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-6xl lg:pb-6">
      <Link
        to="/admin/cash-registers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mouvements Financiers
      </Link>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
                <Receipt className="h-4 w-4" aria-hidden="true" />
              </span>
              Transactions
            </CardTitle>
            {transactionsData && (
              <Badge variant="secondary" className="rounded-lg px-2.5 py-1 font-medium tabular-nums">
                {totalTransactions}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {transactionsLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner label="Chargement des transactions..." />
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">Aucune transaction pour ce registre.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    registerIri={cashRegisterIri}
                  />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/70 bg-muted/30 hover:bg-muted/30">
                      <TableHead className="h-11 w-[7.5rem] text-[11px] font-semibold uppercase tracking-wider">
                        Date
                      </TableHead>
                      <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider">
                        Opération
                      </TableHead>
                      <TableHead className="h-11 w-[9rem] text-right text-[11px] font-semibold uppercase tracking-wider">
                        Montant
                      </TableHead>
                      <TableHead className="h-11 w-[12rem] text-[11px] font-semibold uppercase tracking-wider">
                        Statut
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow
                        key={transaction.id}
                        className="cursor-pointer border-border/60"
                        onClick={() => void navigate(`/cash-transactions/${transaction.id}`)}
                      >
                        <TableCell className="align-top">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium tabular-nums">
                              {formatDate(transaction.transactionDate)}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatTransactionTime(transaction.transactionDate)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[28rem] align-top">
                          <TransactionOperationCell
                            transaction={transaction}
                            registerIri={cashRegisterIri}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <TransactionAmounts
                            transaction={transaction}
                            registerIri={cashRegisterIri}
                          />
                        </TableCell>
                        <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                          <CashTransactionStatusActions transaction={transaction} layout="menu" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalTransactions > ITEMS_PER_PAGE && (
                <Pagination
                  page={page}
                  totalItems={totalTransactions}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registre</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{register.name}</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{register.code}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={register.active ? 'success' : 'destructive'}>
                {register.active ? 'Actif' : 'Inactif'}
              </Badge>
              {register.deleted && <Badge variant="destructive">Supprimé</Badge>}
            </div>
            <div className="space-y-2 rounded-xl bg-brand-orange/10 px-4 py-3">
              <p className="text-xs text-muted-foreground">Soldes actuels</p>
              <p className="text-xl font-bold tabular-nums text-brand-orange">{moneyUsd(usdBalance)}</p>
              <p className="text-lg font-semibold tabular-nums text-brand-orange">{moneyCdf(cdfBalance)}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-brand-orange/30 text-brand-orange hover:bg-brand-orange/5"
              onClick={() => setReportModalOpen(true)}
            >
              <FileText className="h-4 w-4" />
              Rapport mouvements financiers PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </span>
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DetailRow label="Code" value={register.code} mono />
          <DetailRow label="Nom" value={register.name} />
          <DetailRow label="Solde d'ouverture USD" value={moneyUsd(parseCashRegisterBalance(register.openingBalanceUSD))} />
          <DetailRow label="Solde d'ouverture CDF" value={moneyCdf(parseCashRegisterBalance(register.openingBalanceCDF))} />
          <DetailRow label="Solde actuel USD" value={moneyUsd(usdBalance)} />
          <DetailRow label="Solde actuel CDF" value={moneyCdf(cdfBalance)} />
          {register.createdAt && <DetailRow label="Créé le" value={formatDateTime(register.createdAt)} />}
          {register.updatedAt && <DetailRow label="Modifié le" value={formatDateTime(register.updatedAt)} />}
        </CardContent>
      </Card>

      <div className="hidden flex-wrap justify-end gap-2 pt-2 lg:flex">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl"
          asChild
        >
          <Link to={`/admin/cash-registers/transfer?source=${encodeURIComponent(toIri('cash_registers', register.id))}`}>
            <ArrowLeftRight className="h-4 w-4" />
            Transfert
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl border-brand-orange/30 text-brand-orange hover:bg-brand-orange/5"
          onClick={() => setReportModalOpen(true)}
        >
          <FileText className="h-4 w-4" />
          Rapport PDF
        </Button>
        <Button asChild className="h-11 rounded-xl px-8">
          <Link to={`/admin/cash-registers/${register.id}/edit`}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Modifier
          </Link>
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl space-y-2 p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl"
            asChild
          >
            <Link to={`/admin/cash-registers/transfer?source=${encodeURIComponent(toIri('cash_registers', register.id))}`}>
              <ArrowLeftRight className="h-4 w-4" />
              Transfert
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-brand-orange/30 text-brand-orange hover:bg-brand-orange/5"
            onClick={() => setReportModalOpen(true)}
          >
            <FileText className="h-4 w-4" />
            Rapport mouvements financiers PDF
          </Button>
          <Button asChild className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90">
            <Link to={`/admin/cash-registers/${register.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      <CashRegisterReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        register={register}
      />
    </div>
  )
}
