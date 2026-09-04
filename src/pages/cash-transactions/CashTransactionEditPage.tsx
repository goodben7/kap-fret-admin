import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Receipt } from 'lucide-react'
import { useCashTransaction, useUpdateCashTransaction } from '@/hooks/useCashTransactions'
import { CashTransactionEditForm } from '@/components/forms/CashTransactionEditForm'
import {
  canEditOrDeleteCashTransaction,
  cashTransactionToPatchFormDefaults,
  toCashTransactionPatchPayload,
} from '@/lib/cash-transaction'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import type { CashTransactionPatchFormData } from '@/schemas/cash-transaction.schema'

export function CashTransactionEditPage() {
  const { id } = useParams<{ id: string }>()
  const transactionId = id ?? ''
  const navigate = useNavigate()
  const { data: transaction, isLoading } = useCashTransaction(transactionId)
  const updateTransaction = useUpdateCashTransaction()

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

  if (!canEditOrDeleteCashTransaction(transaction)) {
    return (
      <EmptyState
        icon={Pencil}
        title="Modification impossible"
        description="Seuls les mouvements manuels (entrée/sortie) non validés peuvent être modifiés."
        action={{
          label: 'Voir la transaction',
          onClick: () => { window.location.href = `/cash-transactions/${transaction.id}` },
        }}
      />
    )
  }

  const handleSubmit = async (data: CashTransactionPatchFormData) => {
    await updateTransaction.mutateAsync({
      id: transaction.id,
      payload: toCashTransactionPatchPayload(data),
    })
    void navigate(`/cash-transactions/${transaction.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to={`/cash-transactions/${transaction.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour à la transaction
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Pencil className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Modifier le mouvement</h1>
        </div>
        <p className="pl-11 font-mono text-xs text-muted-foreground">{transaction.id}</p>
      </div>

      <CashTransactionEditForm
        defaultValues={cashTransactionToPatchFormDefaults(transaction)}
        onSubmit={handleSubmit}
        isLoading={updateTransaction.isPending}
        cancelHref={`/cash-transactions/${transaction.id}`}
      />
    </div>
  )
}
