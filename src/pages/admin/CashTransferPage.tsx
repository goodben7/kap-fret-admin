import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight } from 'lucide-react'
import { useTransferCashTransaction } from '@/hooks/useCashTransactions'
import { CashTransferForm } from '@/components/forms/CashTransferForm'
import { toCashTransactionTransferPayload } from '@/lib/cash-transaction'
import { extractResourceId } from '@/lib/hydra'
import type { CashTransactionTransferFormData } from '@/schemas/cash-transaction.schema'

export function CashTransferPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultSourceCashRegister = searchParams.get('source')?.trim() ?? ''
  const transferTransaction = useTransferCashTransaction()

  const handleSubmit = async (data: CashTransactionTransferFormData) => {
    await transferTransaction.mutateAsync(toCashTransactionTransferPayload(data))
    const sourceId = extractResourceId(data.sourceCashRegister)
    void navigate(sourceId ? `/admin/cash-registers/${sourceId}` : '/admin/cash-registers')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/cash-registers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mouvements Financiers
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Transfert entre caisses</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          Déplacez un montant d&apos;une caisse vers une autre
        </p>
      </div>

      <CashTransferForm
        onSubmit={handleSubmit}
        isLoading={transferTransaction.isPending}
        defaultSourceCashRegister={defaultSourceCashRegister}
      />
    </div>
  )
}
