import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Pencil,
  Receipt,
  Wallet,
} from 'lucide-react'
import { useCashRegister } from '@/hooks/useCashRegisters'
import { useCashTransactions } from '@/hooks/useCashTransactions'
import { CashRegisterReportModal } from '@/components/cash-registers/CashRegisterReportModal'
import { parseCashRegisterBalance } from '@/lib/cash-register'
import { CURRENCY } from '@/constants/ticket'
import {
  cashTransactionReferencePath,
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
import { cn, formatDateTime, formatMoney } from '@/lib/utils'

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

function TransactionTypeBadge({ type }: { type: CashTransaction['type'] }) {
  const isEntry = type === CASH_TRANSACTION_TYPE.ENTRY
  return (
    <Badge variant={isEntry ? 'success' : 'destructive'} className="gap-1">
      {isEntry ? <ArrowDownLeft className="h-3 w-3" aria-hidden="true" /> : <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
      {getCashTransactionTypeLabel(type)}
    </Badge>
  )
}

function TransactionAmounts({ transaction }: { transaction: CashTransaction }) {
  const amountCode = getCashTransactionCurrencyCode(transaction.currency) ?? 'USD'
  const txCode = getCashTransactionCurrencyCode(transaction.transactionCurrency) ?? amountCode
  const amount = parseFloat(transaction.amount) || 0
  const txAmount = parseFloat(transaction.transactionAmount) || 0
  const showTxLine = txCode !== amountCode || transaction.transactionAmount !== transaction.amount

  return (
    <div className="space-y-0.5 text-right">
      <p className="font-semibold tabular-nums">{formatMoney(amount, amountCode)}</p>
      {showTxLine && (
        <p className="text-xs text-muted-foreground tabular-nums">
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
        {label} · <span className="font-mono">{transaction.referenceId}</span>
      </span>
    )
  }

  return (
    <Link to={path} className="text-xs font-medium text-primary hover:underline">
      {label} · <span className="font-mono">{transaction.referenceId}</span>
    </Link>
  )
}

function TransactionCard({ transaction }: { transaction: CashTransaction }) {
  return (
    <Card className="rounded-2xl border-border/80 shadow-sm lg:hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <TransactionTypeBadge type={transaction.type} />
            <Badge variant={transaction.validated ? 'secondary' : 'outline'}>
              {transaction.validated ? 'Validée' : 'Non validée'}
            </Badge>
          </div>
          <TransactionAmounts transaction={transaction} />
        </div>
        <p className="text-sm font-medium leading-snug">{transaction.description}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <TransactionReference transaction={transaction} />
          <span>{formatDateTime(transaction.transactionDate)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function CashRegisterDetailPage() {
  const { id } = useParams<{ id: string }>()
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
        <LoadingSpinner label="Chargement de la caisse..." />
      </div>
    )
  }

  if (!register) {
    return (
      <EmptyState
        icon={Wallet}
        title="Caisse introuvable"
        description="Cette caisse n'existe pas ou a été supprimée."
        action={{ label: 'Retour à la liste', onClick: () => { window.location.href = '/admin/cash-registers' } }}
      />
    )
  }

  const usdBalance = parseCashRegisterBalance(register.currentBalanceUSD)
  const cdfBalance = parseCashRegisterBalance(register.currentBalanceCDF)
  const moneyUsd = (amount: number) => formatMoney(amount, CURRENCY.USD)
  const moneyCdf = (amount: number) => formatMoney(amount, CURRENCY.CDF)
  const transactions = transactionsData?.items ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-5xl lg:pb-6">
      <Link
        to="/admin/cash-registers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Caisses
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caisse</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{register.name}</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{register.code}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={register.active ? 'success' : 'destructive'}>
                {register.active ? 'Actif' : 'Inactif'}
              </Badge>
              {register.deleted && <Badge variant="destructive">Supprimé</Badge>}
            </div>
            <div className="rounded-xl bg-brand-orange/10 px-4 py-3 space-y-2">
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
              Rapport de caisse PDF
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

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Receipt className="h-4 w-4" aria-hidden="true" />
              </span>
              Transactions
            </CardTitle>
            {transactionsData && (
              <span className="text-sm text-muted-foreground">
                {transactionsData.totalItems} transaction{transactionsData.totalItems !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {transactionsLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner label="Chargement des transactions..." />
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune transaction pour cette caisse.</p>
          ) : (
            <>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-border/80 lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead className="text-right">Montant caisse</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTime(transaction.transactionDate)}
                        </TableCell>
                        <TableCell>
                          <TransactionTypeBadge type={transaction.type} />
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <p className="truncate text-sm font-medium" title={transaction.description}>
                            {transaction.description}
                          </p>
                        </TableCell>
                        <TableCell>
                          <TransactionReference transaction={transaction} />
                        </TableCell>
                        <TableCell>
                          <TransactionAmounts transaction={transaction} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.validated ? 'secondary' : 'outline'}>
                            {transaction.validated ? 'Validée' : 'En attente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {transactionsData && transactionsData.totalItems > ITEMS_PER_PAGE && (
                <Pagination
                  page={page}
                  totalItems={transactionsData.totalItems}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="hidden flex-wrap justify-end gap-2 pt-2 lg:flex">
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
            Modifier la caisse
          </Link>
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl space-y-2 p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-brand-orange/30 text-brand-orange hover:bg-brand-orange/5"
            onClick={() => setReportModalOpen(true)}
          >
            <FileText className="h-4 w-4" />
            Rapport de caisse PDF
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
