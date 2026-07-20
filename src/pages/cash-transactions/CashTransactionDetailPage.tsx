import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Receipt,
} from 'lucide-react'
import { useCashTransaction, useValidateCashTransaction } from '@/hooks/useCashTransactions'
import {
  cashTransactionReferencePath,
  getCashTransactionCashRegisterIri,
  getCashTransactionCashRegisterLabel,
  getCashTransactionCashRegisterRef,
  getCashTransactionCurrencyCode,
  getCashTransactionIssuingOfficeLabel,
  getCashTransactionReferenceTypeLabel,
  getCashTransactionTypeLabel,
} from '@/lib/cash-transaction'
import { CASH_TRANSACTION_TYPE } from '@/constants/cash-transaction'
import { getUserRefLabel } from '@/lib/user-ref'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { cn, formatDateTime, formatMoney } from '@/lib/utils'
import type { CashTransaction } from '@/types/cash-transaction'

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

function TransactionAmounts({ transaction }: { transaction: CashTransaction }) {
  const amountCode = getCashTransactionCurrencyCode(transaction.currency) ?? 'USD'
  const txCode = getCashTransactionCurrencyCode(transaction.transactionCurrency) ?? amountCode
  const amount = parseFloat(transaction.amount) || 0
  const txAmount = parseFloat(transaction.transactionAmount) || 0
  const showTxLine = txCode !== amountCode || transaction.transactionAmount !== transaction.amount

  return (
    <div className="space-y-1 text-right">
      <p className="text-lg font-bold tabular-nums text-brand-orange">{formatMoney(amount, amountCode)}</p>
      {showTxLine && (
        <p className="text-sm text-muted-foreground tabular-nums">
          Opération : {formatMoney(txAmount, txCode)}
        </p>
      )}
      {transaction.rateUsed && showTxLine && (
        <p className="text-xs text-muted-foreground">
          Taux : {parseFloat(transaction.rateUsed).toLocaleString('fr-FR')}
        </p>
      )}
    </div>
  )
}

export function CashTransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const transactionId = id ?? ''
  const [validateOpen, setValidateOpen] = useState(false)

  const { data: transaction, isLoading } = useCashTransaction(transactionId)
  const validateTransaction = useValidateCashTransaction()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement de la transaction..." />
      </div>
    )
  }

  if (!transaction) {
    return (
      <EmptyState
        icon={Receipt}
        title="Transaction introuvable"
        description="Cette transaction n'existe pas."
        action={{ label: 'Retour à la liste', onClick: () => { window.location.href = '/cash-transactions' } }}
      />
    )
  }

  const isEntry = transaction.type === CASH_TRANSACTION_TYPE.ENTRY
  const referencePath = cashTransactionReferencePath(transaction.referenceType, transaction.referenceId)
  const registerIri = getCashTransactionCashRegisterIri(transaction.cashRegister)

  const handleValidate = async () => {
    await validateTransaction.mutateAsync(transaction.id)
    setValidateOpen(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/cash-transactions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mouvements Financiers
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transaction</p>
              <p className="font-mono text-xs text-muted-foreground">{transaction.id}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={isEntry ? 'success' : 'destructive'} className="gap-1">
                  {isEntry ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                  {getCashTransactionTypeLabel(transaction.type)}
                </Badge>
                <Badge variant={transaction.validated ? 'secondary' : 'outline'}>
                  {transaction.validated ? 'Validée' : 'En attente'}
                </Badge>
              </div>
              <p className="text-base font-semibold leading-snug">{transaction.description}</p>
            </div>
            <TransactionAmounts transaction={transaction} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </span>
            Détails
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DetailRow label="Date transaction" value={formatDateTime(transaction.transactionDate)} />
          <DetailRow
            label="Caisse"
            value={
              registerIri ? (
                <Link to={`/admin/cash-registers/${getCashTransactionCashRegisterRef(transaction.cashRegister)?.id ?? ''}`} className="text-primary hover:underline">
                  {getCashTransactionCashRegisterLabel(transaction.cashRegister)}
                </Link>
              ) : (
                getCashTransactionCashRegisterLabel(transaction.cashRegister)
              )
            }
          />
          <DetailRow label="Bureau" value={getCashTransactionIssuingOfficeLabel(transaction.issuingOffice)} />
          <DetailRow label="Type référence" value={getCashTransactionReferenceTypeLabel(transaction.referenceType)} />
          <DetailRow
            label="Référence"
            value={
              referencePath ? (
                <Link to={referencePath} className="font-mono text-primary hover:underline">
                  {transaction.referenceId}
                </Link>
              ) : (
                transaction.referenceId || '—'
              )
            }
            mono
          />
          {getUserRefLabel(transaction.createdBy) && (
            <DetailRow label="Créée par" value={getUserRefLabel(transaction.createdBy)!} />
          )}
          {transaction.createdAt && (
            <DetailRow label="Créée le" value={formatDateTime(transaction.createdAt)} />
          )}
        </CardContent>
      </Card>

      {!transaction.validated && (
        <>
          <div className="hidden justify-end lg:flex">
            <Button
              type="button"
              className="h-11 rounded-xl px-8"
              onClick={() => setValidateOpen(true)}
              disabled={validateTransaction.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Valider la transaction
            </Button>
          </div>
          <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur lg:hidden">
            <div className="mx-auto max-w-3xl p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90"
                onClick={() => setValidateOpen(true)}
                disabled={validateTransaction.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Valider la transaction
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={validateOpen}
        onOpenChange={(open) => { if (!open && !validateTransaction.isPending) setValidateOpen(false) }}
        variant="success"
        title="Valider cette transaction ?"
        description="La transaction sera marquée comme validée et impactera le solde de la caisse."
        confirmLabel="Oui, valider"
        cancelLabel="Annuler"
        onConfirm={handleValidate}
        loading={validateTransaction.isPending}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Montant</span>
            <TransactionAmounts transaction={transaction} />
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Description</span>
            <span className="text-right font-medium">{transaction.description}</span>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
