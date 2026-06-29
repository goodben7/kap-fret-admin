import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Receipt } from 'lucide-react'
import { useCreateCashTransaction } from '@/hooks/useCashTransactions'
import { CashTransactionForm } from '@/components/forms/CashTransactionForm'
import { toCashTransactionCreatePayload } from '@/lib/cash-transaction'
import type { CashTransactionCreateFormData } from '@/schemas/cash-transaction.schema'

export function CashTransactionCreatePage() {
  const navigate = useNavigate()
  const createTransaction = useCreateCashTransaction()

  const handleSubmit = async (data: CashTransactionCreateFormData) => {
    const created = await createTransaction.mutateAsync(toCashTransactionCreatePayload(data))
    void navigate(`/cash-transactions/${created.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/cash-transactions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Transactions caisse
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Receipt className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle transaction</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          Enregistrez une entrée ou sortie de caisse manuelle
        </p>
      </div>

      <CashTransactionForm
        onSubmit={handleSubmit}
        isLoading={createTransaction.isPending}
        submitLabel="Créer la transaction"
      />
    </div>
  )
}
