import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useConvertCashTransaction } from '@/hooks/useCashTransactions'
import { CashConversionForm } from '@/components/forms/CashConversionForm'
import { toCashTransactionConversionPayload } from '@/lib/cash-transaction'
import type { CashTransactionConversionFormData } from '@/schemas/cash-transaction.schema'

export function CashConversionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultCashRegister = searchParams.get('cashRegister')?.trim() ?? ''
  const convertTransaction = useConvertCashTransaction()

  const handleSubmit = async (data: CashTransactionConversionFormData) => {
    await convertTransaction.mutateAsync(toCashTransactionConversionPayload(data))
    void navigate('/cash-transactions')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/cash-transactions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mouvements financiers
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Conversion de monnaie</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          Échangez USD ↔ CDF sur une même caisse, avec taux et montant converti automatique
        </p>
      </div>

      <CashConversionForm
        onSubmit={handleSubmit}
        isLoading={convertTransaction.isPending}
        defaultCashRegister={defaultCashRegister}
      />
    </div>
  )
}
