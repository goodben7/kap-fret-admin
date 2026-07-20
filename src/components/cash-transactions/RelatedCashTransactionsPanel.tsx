import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Receipt } from 'lucide-react'
import { useCashTransactions } from '@/hooks/useCashTransactions'
import {
  getCashTransactionCashRegisterLabel,
  getCashTransactionCurrencyCode,
  getCashTransactionTypeLabel,
} from '@/lib/cash-transaction'
import { CASH_TRANSACTION_REFERENCE_TYPE, CASH_TRANSACTION_TYPE } from '@/constants/cash-transaction'
import type { CashTransactionReferenceType } from '@/constants/cash-transaction'
import type { CashTransaction } from '@/types/cash-transaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime, formatMoney } from '@/lib/utils'

function TypeBadge({ type }: { type: CashTransaction['type'] }) {
  const isEntry = type === CASH_TRANSACTION_TYPE.ENTRY
  return (
    <Badge variant={isEntry ? 'success' : 'destructive'} className="gap-1">
      {isEntry ? <ArrowDownLeft className="h-3 w-3" aria-hidden="true" /> : <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
      {getCashTransactionTypeLabel(type)}
    </Badge>
  )
}

function TransactionRow({ transaction }: { transaction: CashTransaction }) {
  const currencyCode = getCashTransactionCurrencyCode(transaction.currency) ?? 'USD'
  const txCurrencyCode = getCashTransactionCurrencyCode(transaction.transactionCurrency) ?? currencyCode
  const amount = parseFloat(transaction.amount) || 0
  const txAmount = parseFloat(transaction.transactionAmount) || 0
  const showTxLine = txCurrencyCode !== currencyCode || transaction.transactionAmount !== transaction.amount

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <Link to={`/cash-transactions/${transaction.id}`} className="group block space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={transaction.type} />
                <Badge variant={transaction.validated ? 'secondary' : 'outline'}>
                  {transaction.validated ? 'Validée' : 'En attente'}
                </Badge>
              </div>
              <p className="line-clamp-2 text-sm font-medium leading-snug">{transaction.description}</p>
              <p className="text-xs text-muted-foreground">
                {getCashTransactionCashRegisterLabel(transaction.cashRegister)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-bold tabular-nums text-brand-orange">{formatMoney(amount, currencyCode)}</p>
              {showTxLine && (
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  Caisse : {formatMoney(txAmount, txCurrencyCode)}
                </p>
              )}
              <ChevronRight className="ml-auto mt-2 h-5 w-5 text-muted-foreground/50 group-hover:text-brand-orange" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{transaction.id}</span>
            <span>{formatDateTime(transaction.transactionDate)}</span>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

interface RelatedCashTransactionsPanelProps {
  referenceType:
    | typeof CASH_TRANSACTION_REFERENCE_TYPE.TICKET
    | typeof CASH_TRANSACTION_REFERENCE_TYPE.CHECKIN
    | typeof CASH_TRANSACTION_REFERENCE_TYPE.FREIGHT
  referenceId: string
  emptyDescription?: string
}

export function RelatedCashTransactionsPanel({
  referenceType,
  referenceId,
  emptyDescription = 'Aucune transaction caisse liée pour le moment.',
}: RelatedCashTransactionsPanelProps) {
  const { data, isLoading } = useCashTransactions(
    {
      referenceType: referenceType as CashTransactionReferenceType,
      referenceId,
      itemsPerPage: 50,
    },
    { enabled: !!referenceId },
  )

  const transactions = data?.items ?? []

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement des transactions..." />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Aucune transaction"
        description={emptyDescription}
      />
    )
  }

  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </span>
            Transactions
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {data?.totalItems ?? transactions.length} transaction
            {(data?.totalItems ?? transactions.length) !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {transactions.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </CardContent>
    </Card>
  )
}
